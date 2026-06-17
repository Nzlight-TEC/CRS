import Player from "../entities/Player/player.js";
import Enemy from "../entities/Enemy/enemy.js";
import XPOrb from "../entities/XPOrb.js";
import UpgradeSystem from "../systems/UpgradeSystem.js";
import BattlePassSystem from "../systems/BattlePassSystem.js";
import CoinSystem from "../systems/CoinSystem.js";
import ClassSystem from "../systems/ClassSystems.js";
import PassiveSystem from "../systems/PassiveSystem/PassiveSystem.js";
import WeaponSystem from "../systems/WeaponSystem.js";
import SpawnDirector from "../Director/SpawnDirector.js";
import { PLAYER_CLASSES } from "../entities/Player/PlayerClass.js";
import EnemyBullet from "../entities/Enemy/EnemyBullet.js";
import VirtualJoystick from "../VirtualJoystick.js?v=pwa-v1";
import {
  RANKING_MODES,
  normalizeRankingMode,
  saveBestRanking
} from "../systems/RankingService.js?v=pwa-v1";

const SELECTED_MODE_STORAGE_KEY = 'chaos_selected_game_mode';

export default class MainScene extends Phaser.Scene {
  constructor() {
    // chave da scene (consistente com o que você usa ao start)
    super({ key: "MainScene" });
  }

  preload() {
    const g = this.add.graphics();

    const shapes = [
      { key: "player", color: 0xffffff, type: "rect", w: 20, h: 20 },
      { key: "enemy", color: 0xff3333, type: "rect", w: 20, h: 20 },
      { key: "xp_orb", color: 0x6a00ff, type: "circle", r: 5 },
      { key: "flask", color: 0xffffff, type: "rect", w: 8, h: 8 }
    ];

    this.load.image('map', 'assets/img/mapa atualizado pt4.png');

    this.load.spritesheet("alquimista", "assets/Sprites/Alquimista12.png", {
      frameWidth: 125,
      frameHeight: 250,
      endFrame: 7
    });

    this.load.spritesheet("coveiro", "assets/Sprites/coveiro-recortado.png", {
      frameWidth: 288,
      frameHeight: 360,
      endFrame: 13
    });

    this.load.spritesheet("bastiao", "assets/Sprites/karg.png", {
      frameWidth: 128,
      frameHeight: 128
    });

    this.load.spritesheet("foiceGirando", "assets/Sprites/foice-girando-recortada.png", {
      frameWidth: 160,
      frameHeight: 160,
      endFrame: 39
    });

    shapes.forEach(shape => {
      g.clear();
      g.fillStyle(shape.color, 1);

      if (shape.type === "rect") g.fillRect(0, 0, shape.w, shape.h);
      else g.fillCircle(shape.r, shape.r, shape.r);

      g.generateTexture(shape.key, shape.w || shape.r * 2, shape.h || shape.r * 2);
    });

    if (!this.textures.exists("pixel")) {
      const gfx = this.make.graphics({ x: 0, y: 0, add: false });
      gfx.fillStyle(0xffffff, 1);
      gfx.fillRect(0, 0, 1, 1);
      gfx.generateTexture("pixel", 1, 1);
      gfx.destroy();
    }

    g.destroy();
  }

  init(data) {
    this.selectedClassKey = data?.selectedClassKey ?? null;
    this.selectedGameMode = normalizeRankingMode(
      data?.selectedGameMode ??
      data?.gameMode ??
      localStorage.getItem(SELECTED_MODE_STORAGE_KEY) ??
      RANKING_MODES.FINITE
    );
    this.gameMode = this.selectedGameMode;
    this.isInfiniteMode = this.gameMode === RANKING_MODES.INFINITE;
    console.log("Selected class key:", this.selectedClassKey);
    console.log("Selected game mode:", this.gameMode);
  }

  createWorldBounds() {
    const wallThickness = 64;

    this.walls = this.physics.add.staticGroup();

    const top = this.add.rectangle(0, 0, this.worldWidth, wallThickness)
      .setOrigin(0)
      .setVisible(false);
    const bottom = this.add.rectangle(0, this.worldHeight - wallThickness, this.worldWidth, wallThickness)
      .setOrigin(0)
      .setVisible(false);
    const left = this.add.rectangle(0, 0, wallThickness, this.worldHeight)
      .setOrigin(0)
      .setVisible(false);
    const right = this.add.rectangle(this.worldWidth - wallThickness, 0, wallThickness, this.worldHeight)
      .setOrigin(0)
      .setVisible(false);

    [top, bottom, left, right].forEach(wall => {
      this.physics.add.existing(wall, true);
      this.walls.add(wall);
    });
  }

  resetRunState() {
    this.score = 0;
    this.rankingSaved = false;
    this.rankingSavePromise = null;
    this.runEnded = false;
    this.isGameStarted = false;
    this.gameMode = this.selectedGameMode || RANKING_MODES.FINITE;
    this.isInfiniteMode = this.gameMode === RANKING_MODES.INFINITE;

    this.player = null;
    this.weaponSystem = null;
    this.passiveSystem = null;
    this.currentWeaponKey = null;
    this.joystick = null;
    this.weaponLoopEvent = null;
    this.auraDamageEvent = null;
    this.escPauseHandler = null;
    this.spacePassiveHandler = null;
    this.enemyKilledHandler = null;
    this.returnToMenuTimeout = null;
    this.returningToMenu = false;
  }

  shutdownRun() {
    try { this.time.timeScale = 1; } catch (error) { }
    this.isGameStarted = false;

    if (this.returnToMenuTimeout) {
      try { globalThis.clearTimeout(this.returnToMenuTimeout); } catch (error) { }
      this.returnToMenuTimeout = null;
    }

    try { this.weaponLoopEvent?.remove?.(false); } catch (error) { }
    this.weaponLoopEvent = null;

    try { this.auraDamageEvent?.remove?.(false); } catch (error) { }
    this.auraDamageEvent = null;

    try { this.passiveSystem?.destroy?.(); } catch (error) {
      console.warn("Falha ao limpar passiva:", error);
    }
    this.passiveSystem = null;
    this.currentWeaponKey = null;
    this.weaponSystem = null;

    try { this.joystick?.destroy?.(); } catch (error) { }
    this.joystick = null;

    try { this.enemiesInAura?.clear?.(); } catch (error) { }

    if (this.input?.keyboard) {
      if (this.escPauseHandler) {
        try { this.input.keyboard.off("keydown-ESC", this.escPauseHandler); } catch (error) { }
      }

      if (this.spacePassiveHandler) {
        try { this.input.keyboard.off("keydown-SPACE", this.spacePassiveHandler); } catch (error) { }
      }
    }

    if (this.enemyKilledHandler) {
      try { this.events.off("enemyKilled", this.enemyKilledHandler); } catch (error) { }
    }

    this.escPauseHandler = null;
    this.spacePassiveHandler = null;
    this.enemyKilledHandler = null;
    this.player = null;
  }

  returnToMenu() {
    if (this.returningToMenu) return;
    this.returningToMenu = true;

    if (this.returnToMenuTimeout) {
      globalThis.clearTimeout(this.returnToMenuTimeout);
      this.returnToMenuTimeout = null;
    }

    this.time.timeScale = 1;
    this.physics?.resume?.();
    this.scene.stop("PauseMenu");
    this.scene.start("MenuScene");
  }

  requestPause() {
    if (this.runEnded || !this.isGameStarted) return;
    if (this.scene.isPaused('MainScene')) return;

    this.pauseGame();
    this.scene.launch('PauseMenu');
  }

  triggerPassiveAction() {
    if (!this.passiveSystem || !this.player || this.runEnded) return false;

    const name = (this.player.classKey || this.player.currentClass || this.player.className || "")
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z]/g, "");

    let actionUsed = false;
    if (name.includes("alquimista")) {
      actionUsed = this.passiveSystem.activatePassiva?.() ?? true;
    } else if (name.includes("coveiro")) {
      actionUsed = this.passiveSystem.activateAscension?.(this.player) ?? true;
    } else if (name.includes("bastiao")) {
      actionUsed = this.passiveSystem.active?.activateSuper?.() ?? false;
    }

    if (actionUsed) {
      this.battlePassSystem?.notify("skillUsed", {});
    }

    this.joystick?.consumeSkill?.();
    return actionUsed;
  }


  create() {
    this.shutdownRun();
    this.resetRunState();
    this.events.once("shutdown", this.shutdownRun, this);
    this.time.timeScale = 1;

    // Tecla ESC do menu de pausa
    this.escPauseHandler = () => {
      this.requestPause();
    };
    this.input.keyboard.on('keydown-ESC', this.escPauseHandler);

    // Mundo
    this.worldWidth = 15000;
    this.worldHeight = 15000;
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);

    // Fundo repetido automaticamente pelo Phaser
    this.background = this.add.tileSprite(0, 0, this.worldWidth, this.worldHeight, 'map')
      .setOrigin(0)
      .setDepth(-1);

    this.createWorldBounds();

    // Grupos
    this.enemies = this.physics.add.group({ runChildUpdate: true });
    this.xpOrbs = this.physics.add.group({
      classType: XPOrb,
      runChildUpdate: true
    });
    this.enemiesInAura = new Set();

    // Sistemas (sem player)
    this.upgradeSystem = new UpgradeSystem(this);
    this.classSystem = new ClassSystem(this);
    this.battlePassSystem = new BattlePassSystem(this);
    this.coinSystem = new CoinSystem(this);
    this.weaponSystem = null;
    this.passiveSystem = null;
    this.joystick = new VirtualJoystick({
      onSkill: () => this.triggerPassiveAction(),
      onPause: () => this.requestPause()
    });

    // Spawn Director
    this.SpawnDirector = new SpawnDirector(this);

    // ===== UI =====
    this.passiveBarBg = this.add.rectangle(100, 70, 200, 10, 0x222222)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(1000);

    this.passiveBar = this.add.rectangle(100, 70, 0, 10, 0x00ff88)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(1001);

    this.passiveText = this.add.text(310, 65, "Passiva: 0%", {
      fontSize: "14px",
      fill: "#00ffcc"
    })
      .setScrollFactor(0)
      .setDepth(1001);

    // ===== TIMER =====
    this.matchDuration = 10 * 60 * 1000; // 10 minutos
    this.matchStartTime = this.time.now;

    this.timerText = this.add.text(16, 16, this.isInfiniteMode ? "INF 00:00" : "10:00", {
      fontSize: "18px",
      fill: "#ffffff",
      stroke: "#000",
      strokeThickness: 3
    })
      .setScrollFactor(0)
      .setDepth(1000);

    this.scoreText = this.add.text(16, 42, "Pontos: 0", {
      fontSize: "18px",
      fill: "#00ffff",
      stroke: "#000",
      strokeThickness: 3
    })
      .setScrollFactor(0)
      .setDepth(1000);

    this.createHordeWarningHud();

    // ===== INPUT =====
    this.spaceKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );

    this.spacePassiveHandler = () => {
      this.triggerPassiveAction();
    };
    this.input.keyboard.on("keydown-SPACE", this.spacePassiveHandler);

    // XP drop
    this.enemyKilledHandler = enemy => {
      if (!enemy) return;
      this.addScore(enemy.xpValue || 10);
      this.spawnXPOrb(enemy.x, enemy.y, enemy.xpValue);
      this.battlePassSystem?.notify("enemyKilled", { enemy });
      if (this.coinSystem?.addCoins(1)) {
        this.createFloatingText(enemy.x, enemy.y - 10, "+1 Moeda", "#ffff66");
      }
    };
    this.events.on("enemyKilled", this.enemyKilledHandler);

    this.enemyBullets = this.add.group();

    // Start
    if (!this.selectedClassKey) {
      console.error("Classe não definida, voltando ao menu");
      this.scene.start("MenuScene");
      return;
    }

    console.log("Chamando startGame...");
    this.startGame(this.selectedClassKey);

  }


  startGame(classKey) {
    if (this.isGameStarted) return;
    this.isGameStarted = true;

    // resolve configuração da classe
    const classConfig = PLAYER_CLASSES[classKey];

    if (!classConfig) {
      console.error("Classe inválida:", classKey);
      return;
    }

    // ===== PLAYER =====
    this.player = new Player(
      this,
      this.worldWidth / 2,
      this.worldHeight / 2,
      classKey
    );

    if (!this.player) {
      console.error("Falha ao criar o Player");
      return;
    }

    this.player.setCollideWorldBounds?.(true);
    this.physics.add.collider(this.player, this.walls);

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.weaponSystem = new WeaponSystem(this, this.player);
    this.passiveSystem = new PassiveSystem(this, this.player);

    // ===== ANIMAÇÃO DA FOICE GIRANDO =====
    if (!this.anims.exists("foiceGirandoAnim")) {
      this.anims.create({
        key: "foiceGirandoAnim",
        frames: this.anims.generateFrameNumbers("foiceGirando", { start: 0, end: 39 }),
        frameRate: 32,
        repeat: -1
      });
    }

    if (classConfig.weaponKey) {
      this.currentWeaponKey = classConfig.weaponKey;
      this.weaponSystem.useWeapon(classConfig.weaponKey);
    }

    this.passiveSystem.activateClassAbilities?.(classKey);

    // ===== ARMA INICIAL =====
    if (classConfig.weaponKey) {
      this.baseWeaponLoopDelay = 1200;
      this.weaponLoopEvent = this.time.addEvent({
        delay: this.getWeaponLoopDelay(),
        loop: true,
        callback: () => {
          this.weaponSystem.useWeapon(classConfig.weaponKey);
        },
      });
    }

    // ===== MODIFICADORES DE CLASSE =====
    if (classConfig.moveSpeed) {
      this.player.speed *= 1 + classConfig.moveSpeed;
    }

    if (classConfig.damageMultiplier && classConfig.stats?.damage === undefined) {
      this.player.baseDamage *= classConfig.damageMultiplier;
    }

    // ===== HUD =====
    this.healthBarBG = this.add
      .rectangle(100, 20, 200, 20, 0x333333)
      .setOrigin(0)
      .setScrollFactor(0);

    this.healthBar = this.add
      .rectangle(100, 20, 200, 20, 0xff0000)
      .setOrigin(0)
      .setScrollFactor(0);

    this.xpBarBG = this.add
      .rectangle(100, 50, 200, 10, 0x222222)
      .setOrigin(0)
      .setScrollFactor(0);

    this.xpBar = this.add
      .rectangle(100, 50, 0, 10, 0x6a00ff)
      .setOrigin(0)
      .setScrollFactor(0);

    this.levelText = this.add
      .text(310, 35, `Lv ${this.player.level}`, {
        fontSize: "16px",
        fill: "#ffffff",
      })
      .setScrollFactor(0);

    this.pauseMenu = this.add
      .text(25, 95, "ESC - Pausar", {
        fontSize: "14px",
        fontFamily: "sans-serif",
        fill: "#ffffff",
      })
      .setScrollFactor(0)
      .setDepth(1000);

    this.updateHealthBar();
    this.updateXpBar();

    // ===== COLISÕES =====
    this.physics.add.overlap(
      this.player,
      this.xpOrbs,
      this.handleXPCollect,
      null,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.handlePlayerHit,
      null,
      this
    );

    // ===== AURA =====
    if (this.player.aura) {
      this.physics.add.overlap(
        this.player.aura,
        this.enemies,
        (aura, enemy) => {
          this.enemiesInAura.add(enemy);
        }
      );
    }

    // ===== LOOP DE DANO DA AURA =====
    this.auraDamageEvent = this.time.addEvent({
      delay: this.player.damageInterval || 200,
      callback: this.processAuraDamage,
      callbackScope: this,
      loop: true,
    });

    // garante física ativa
    this.physics.resume();
  }


  update(time, delta) {
    if (!this.isGameStarted || !this.player) return;
    if (this.runEnded) return;

    // Player
    this.player.update?.();

    // Spawn
    this.SpawnDirector?.update(time, delta);

    // Enemies (opcional manter mesmo com runChildUpdate)
    this.enemies.children.iterate(enemy => {
      enemy?.update?.(time, delta);
    });
    // XP Orbs
    this.xpOrbs.children.iterate(orb => {
      orb?.update?.(this.player);
    });

    // HUD
    this.updateHealthBar();
    this.updateXpBar();

    // Timer
    if (!this.timerText) return;

    const elapsed = time - this.matchStartTime;

    if (this.isInfiniteMode) {
      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);

      this.timerText.setText(
        `INF ${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      );
      return;
    }

    const remaining = Math.max(0, this.matchDuration - elapsed);

    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);

    this.timerText.setText(
      `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    );

    if (remaining <= 0) {
      this.handleRunEnd("Tempo esgotado!");
    }
  }

  addScore(points) {
    this.score += Math.max(0, Math.floor(points || 0));
    this.scoreText?.setText(`Pontos: ${this.score}`);
  }

  getClosestEnemy(maxRange = Infinity) {
    if (!this.enemies || !this.player) return null;

    let closest = null;
    let minDist = maxRange;

    const px = this.player.x;
    const py = this.player.y;

    this.enemies.children.iterate(enemy => {
      if (!enemy || !enemy.active || enemy.isDead) return;

      const d = Phaser.Math.Distance.Between(px, py, enemy.x, enemy.y);
      if (d < minDist) {
        minDist = d;
        closest = enemy;
      }
    });

    return closest;
  }


  // resto das funções (copie as suas originais, mantive apenas assinaturas)
  processAuraDamage() {
    this.enemiesInAura.forEach(enemy => {
      if (enemy && enemy.active) {
        if (this.player.damageSystem?.dealDamageToEnemy) {
          this.player.damageSystem.dealDamageToEnemy(enemy, this.player.baseDamage || 10);
        } else if (typeof enemy.takeDamage === "function") {
          enemy.takeDamage(this.player.baseDamage || 10);
        } else if (enemy.currentHP !== undefined) {
          enemy.currentHP -= (this.player.baseDamage || 10);
        }
      }
    });

    this.enemiesInAura.clear();
  }

  getWeaponLoopDelay() {
    const baseDelay = this.baseWeaponLoopDelay || 1200;
    const attackSpeed = Math.max(0.1, this.player?.getStat?.("attackSpeed", 1) ?? 1);
    const globalCD = Math.max(0.1, this.player?.getStat?.("globalCD", 1) ?? 1);

    return Math.max(50, baseDelay * globalCD / attackSpeed);
  }

  refreshWeaponLoopTiming() {
    if (!this.weaponLoopEvent || !this.currentWeaponKey || !this.weaponSystem) return;

    const wasPaused = this.weaponLoopEvent.paused;
    this.weaponLoopEvent.remove(false);
    this.weaponLoopEvent = this.time.addEvent({
      delay: this.getWeaponLoopDelay(),
      loop: true,
      paused: wasPaused,
      callback: () => {
        this.weaponSystem.useWeapon(this.currentWeaponKey);
      },
    });
    this.weaponLoopEvent.paused = wasPaused;
  }

  handleXPCollect(playerSprite, orb) {
    if (!orb || orb.collected) return;

    orb.collected = true;

    const xpValue = orb.value || 10;
    let gainedXP = xpValue;

    if (this.player.gainXP) {
      gainedXP = this.player.gainXP(xpValue);
    }

    this.showXPText(orb.x, orb.y, `+${gainedXP} XP`);
    this.events.emit("pickupXP", orb);
    this.battlePassSystem?.notify("xpCollected", { amount: xpValue });

    if (typeof orb.collect === "function") {
      orb.collect(this.player);
    } else {
      orb.setVisible(false);
      if (orb.body) orb.body.enable = false;
      this.time.delayedCall(50, () => {
        try { orb.destroy(); } catch (e) { }
      });
    }
  }

  handlePlayerHit(player, enemy) {
    if (!player.lastHitTime || this.time.now - player.lastHitTime > 1000) {
      if (typeof player.takeDamage === "function") {
        player.takeDamage(10);
      } else {
        player.currentHP -= 10;
        this.updateHealthBar();
      }

      if (player.currentHP <= 0) {
        this.handlePlayerDeath();
        return;
      }

      player.setTint?.(0xff5555);
      this.time.delayedCall(150, () => player.clearTint?.());

      player.lastHitTime = this.time.now;
    }
  }

  playerDied() {
    this.handlePlayerDeath();
  }

  handlePlayerDeath() {
    if (this.runEnded) return;

    this.player.setTint?.(0x000000);
    this.handleRunEnd("GAME OVER", "#ff0000");
    return;

    this.physics.pause();

    this.player.setTint?.(0x000000);

    this.add.text(
      this.scale.width / 2,
      this.scale.height / 2,
      "💀 GAME OVER 💀",
      {
        fontSize: "48px",
        fill: "#ff0000",
        fontStyle: "bold",
        stroke: "#000",
        strokeThickness: 6
      }
    )
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.time.delayedCall(3000, () => this.scene.start("MenuScene"));
  }

  async saveCurrentRanking() {
    if (this.rankingSaved) return true;
    if (this.rankingSavePromise) return this.rankingSavePromise;

    const survivedSeconds = this.matchStartTime ? (this.time.now - this.matchStartTime) / 1000 : 0;
    this.battlePassSystem?.notify("runEnded", { survivedSeconds });

    this.rankingSavePromise = (async () => {
      try {
        const saved = await saveBestRanking({
          pontuacao: this.score || 0,
          level: this.player?.level || 1,
          mode: this.gameMode
        });

        this.rankingSaved = saved;
        return saved;
      } catch (error) {
        console.warn("Erro ao salvar ranking:", error);
        return false;
      } finally {
        this.rankingSavePromise = null;
      }
    })();

    return this.rankingSavePromise;
  }

  handleRunEnd(message, color = "#00ffff") {
    if (this.runEnded) return;
    this.runEnded = true;
    this.isGameStarted = false;

    this.weaponLoopEvent?.remove?.(false);
    this.weaponLoopEvent = null;
    this.auraDamageEvent?.remove?.(false);
    this.auraDamageEvent = null;

    this.time.timeScale = 1;
    this.physics.pause();
    this.joystick?.setVisible?.(false);
    this.saveCurrentRanking();

    this.add.text(
      this.scale.width / 2,
      this.scale.height / 2,
      message,
      {
        fontSize: "48px",
        fill: color,
        fontStyle: "bold",
        stroke: "#000",
        strokeThickness: 6
      }
    )
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.add.text(
      this.scale.width / 2,
      this.scale.height / 2 + 56,
      `Modo: ${this.getGameModeLabel()}  |  Pontos: ${this.score || 0}  |  Level: ${this.player?.level || 1}`,
      {
        fontSize: "22px",
        fill: "#ffffff",
        fontStyle: "bold",
        stroke: "#000",
        strokeThickness: 4,
        align: "center",
        wordWrap: { width: Math.max(260, this.scale.width - 40) }
      }
    )
      .setOrigin(0.5)
      .setScrollFactor(0);

    const menuButton = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2 + 110,
      "VOLTAR AO MENU",
      {
        fontSize: "22px",
        fill: "#ffff00",
        fontStyle: "bold",
        stroke: "#000",
        strokeThickness: 4
      }
    )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });

    menuButton.on("pointerdown", () => {
      this.saveCurrentRanking();
      this.returnToMenu();
    });

    const finalCoins = Math.max(10, Math.floor((this.score || 0) / 40));
    if (this.coinSystem?.addCoins(finalCoins)) {
      this.createFloatingText(this.scale.width / 2, this.scale.height / 2 + 20, `+${finalCoins} Moedas de partida`, "#ffff66");
    }

    this.returnToMenuTimeout = globalThis.setTimeout(() => {
      this.saveCurrentRanking();
      this.returnToMenu();
    }, 3000);
  }

  spawnXPOrb(x, y, value) {
    const orb = new XPOrb(this, x, y, value);
    this.xpOrbs.add(orb);
  }

  getGameModeLabel() {
    return this.isInfiniteMode ? "Infinito" : "Finito";
  }

  updateHealthBar() {
    if (!this.player || !this.healthBar) return;

    const hpPercent = Phaser.Math.Clamp(
      this.player.currentHP / this.player.maxHP,
      0,
      1
    );

    this.healthBar.width = 200 * hpPercent;
  }


  updateXpBar() {
    if (!this.player || !this.xpBar || !this.levelText) return;

    const xpPercent = Phaser.Math.Clamp(
      this.player.xp / this.player.xpToNext,
      0,
      1
    );

    this.xpBar.width = 200 * xpPercent;
    this.levelText.setText(`Lv ${this.player.level}`);
  }


  showXPText(x, y, text) {
    const xpText = this.add.text(x, y - 10, text, {
      fontSize: "16px",
      fill: "#00ffff",
      fontStyle: "bold",
      stroke: "#000",
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);

    this.tweens.add({
      targets: xpText,
      y: y - 40,
      alpha: 0,
      duration: 1000,
      ease: "Cubic.easeOut",
      onComplete: () => xpText.destroy(),
    });
  }

  getHordeWarningWidth() {
    const availableWidth = Math.max(220, this.scale.width - 32);
    return Math.min(360, availableWidth);
  }

  createHordeWarningHud() {
    const warningWidth = this.getHordeWarningWidth();

    this.hordeWarningContainer = this.add
      .container(this.scale.width / 2, 112)
      .setScrollFactor(0)
      .setDepth(2000)
      .setAlpha(0)
      .setVisible(false);

    this.hordeWarningBg = this.add
      .rectangle(0, 0, warningWidth, 56, 0x210000, 0.88)
      .setStrokeStyle(2, 0xff4d00, 1);

    this.hordeText = this.add.text(0, -8, "NOVA HORDA!", {
      fontSize: "24px",
      fill: "#fff1d6",
      fontStyle: "bold",
      stroke: "#000",
      strokeThickness: 5,
      align: "center"
    }).setOrigin(0.5);

    this.hordeSubText = this.add.text(0, 17, "Inimigos chegando!", {
      fontSize: "12px",
      fill: "#ffb06a",
      fontStyle: "bold",
      stroke: "#000",
      strokeThickness: 3,
      align: "center"
    }).setOrigin(0.5);

    this.hordeWarningContainer.add([
      this.hordeWarningBg,
      this.hordeText,
      this.hordeSubText
    ]);

    this.scale.on("resize", this.positionHordeWarning, this);
    this.events.once("shutdown", () => {
      this.scale.off("resize", this.positionHordeWarning, this);
    });
  }

  positionHordeWarning() {
    if (!this.hordeWarningContainer) return;

    const warningWidth = this.getHordeWarningWidth();
    this.hordeWarningContainer.setPosition(this.scale.width / 2, 112);
    this.hordeWarningBg?.setSize(warningWidth, 56);
  }

  showHordeWarning(message = "NOVA HORDA!", detail = "Inimigos chegando!") {
    if (!this.hordeWarningContainer) this.createHordeWarningHud();
    if (!this.hordeWarningContainer) return;

    this.tweens.killTweensOf(this.hordeWarningContainer);
    this.positionHordeWarning();

    this.hordeText?.setText(message);
    this.hordeSubText?.setText(detail);

    this.hordeWarningContainer
      .setVisible(true)
      .setAlpha(1)
      .setScale(0.9);

    this.tweens.add({
      targets: this.hordeWarningContainer,
      scale: 1.08,
      duration: 240,
      yoyo: true,
      repeat: 2,
      ease: "Sine.easeInOut"
    });

    this.tweens.add({
      targets: this.hordeWarningContainer,
      alpha: 0,
      delay: 2400,
      duration: 500,
      ease: "Cubic.easeIn",
      onComplete: () => {
        this.hordeWarningContainer?.setVisible(false);
      }
    });

    this.cameras.main.shake(200, 0.005);
  }

  createFloatingText(x, y, text, color = '#ffffff') {
    const txt = this.add.text(x, y, text, {
      fontSize: "18px",
      color: color,
      fontStyle: "bold",
      stroke: "#000",
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: txt,
      y: y - 40,
      alpha: 0,
      duration: 800,
      ease: "Cubic.Out",
      onComplete: () => {
        txt.destroy()
      }
    });
  }

  resumeGame() {
    this.joystick?.setVisible?.(true);
    this.physics.resume();
    this.scene.resume();
    this.time.timeScale = 1;
  }

  pauseGame() {
    this.joystick?.setVisible?.(false);
    this.physics.pause();
    this.scene.pause();
    this.time.timeScale = 0;
  }
}
