export default class UpgradeSystem {
  constructor(scene) {
    this.scene = scene;
    this.isMenuOpen = false;
    this.menuContainer = null;

    if (!scene) {
      console.error("UpgradeSystem criado sem scene.");
    }

    this.upgrades = [
      {
        id: "damage_up_1",
        name: "Dano +20%",
        desc: "Aumenta o dano causado.",
        apply: (player) => player.stats.multiply("damage", 1.2),
      },
      {
        id: "damage_up_2",
        name: "Dano +35%",
        desc: "Aumenta bastante o dano causado.",
        apply: (player) => player.stats.multiply("damage", 1.35),
      },
      {
        id: "attack_speed",
        name: "Atk Speed +15%",
        desc: "Ataca mais rapido.",
        apply: (player) => player.stats.multiply("attackSpeed", 1.15),
      },
      {
        id: "max_hp_1",
        name: "Vida Maxima +20%",
        desc: "Aumenta a vida maxima.",
        apply: (player) => {
          const oldMaxHP = player.maxHP;

          player.stats.multiply("maxHP", 1.2);
          player.syncStats?.();

          const gainedMaxHP = Math.max(0, player.maxHP - oldMaxHP);
          player.currentHP = Math.min(player.maxHP, player.currentHP + gainedMaxHP);
        },
      },
      {
        id: "regen_hp",
        name: "Regeneracao",
        desc: "Recupera 2 HP por segundo.",
        apply: (player) => {
          if (player.regenEvent) return;

          player.regenEvent = player.scene.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => {
              player.heal?.(2);
            },
          });
        },
      },
      {
        id: "move_speed",
        name: "Velocidade +15%",
        desc: "Move mais rapido.",
        apply: (player) => player.stats.multiply("moveSpeedMultiplier", 1.15),
      },
      {
        id: "pickup_range",
        name: "Pickup +50%",
        desc: "Coleta XP de mais longe.",
        apply: (player) => player.stats.multiply("pickupRadius", 1.5),
      },
      {
        id: "crit_chance",
        name: "Critico +10%",
        desc: "Aumenta a chance de critico.",
        apply: (player) => player.stats.addFlat("critChance", 0.1),
      },
      {
        id: "crit_damage",
        name: "Dano Critico +50%",
        desc: "Aumenta o dano critico.",
        apply: (player) => player.stats.addFlat("critDamage", 0.5),
      },
      {
        id: "projectile_speed",
        name: "Projeteis +20%",
        desc: "Projeteis ficam mais rapidos.",
        apply: (player) => player.stats.multiply("projectileSpeed", 1.2),
      },
      {
        id: "projectile_pierce",
        name: "Perfuracao +1",
        desc: "Projeteis atravessam mais inimigos.",
        apply: (player) => player.stats.addFlat("pierce", 1),
      },
      {
        id: "armor",
        name: "Armadura +2",
        desc: "Reduz dano recebido.",
        apply: (player) => player.stats.addFlat("armor", 2),
      },
      {
        id: "shield",
        name: "Escudo +50",
        desc: "Absorve dano recebido.",
        apply: (player) => {
          player.refillShield?.(50);

          const circle = player.scene.add.circle(player.x, player.y, 40, 0x4da6ff, 0.3);
          player.scene.tweens.add({
            targets: circle,
            scale: 1.5,
            alpha: 0,
            duration: 400,
            onComplete: () => circle.destroy()
          });
        },
      },
      {
        id: "knockback",
        name: "Knockback +40%",
        desc: "Empurra inimigos com mais forca.",
        apply: (player) => player.stats.multiply("knockback", 1.4),
      },
      {
        id: "aoe",
        name: "Area +25%",
        desc: "Aumenta alcance e area.",
        apply: (player) => player.stats.multiply("aoe", 1.25),
      },
      {
        id: "cooldown_global",
        name: "Cooldown -10%",
        desc: "Recarga mais rapido.",
        apply: (player) => player.stats.multiply("globalCD", 0.9),
      },
      {
        id: "xp_gain",
        name: "XP +20%",
        desc: "Recebe mais experiencia.",
        apply: (player) => player.stats.multiply("xpGain", 1.2),
      },
      {
        id: "lifesteal",
        name: "Lifesteal 3%",
        desc: "Recupera vida ao causar dano.",
        apply: (player) => player.stats.addFlat("lifesteal", 0.03),
      },
      {
        id: "double_hit",
        name: "Golpe Duplo",
        desc: "Chance de atacar duas vezes.",
        apply: (player) => player.stats.addFlat("doubleHit", 0.1),
      },
    ];
  }

  openUpgradeMenu() {
    if (this.isMenuOpen) return;
    this.isMenuOpen = true;

    const player = this.scene.player;
    if (!player) return;

    player.lockInput();

    if (this.scene?.cameras?.main) {
      this.scene.cameras.main.flash(300, 255, 255, 255);
    }

    this.scene.physics.pause();
    if (this.scene.weaponLoopEvent) this.scene.weaponLoopEvent.paused = true;

    const cam = this.scene.cameras.main;
    const cx = cam.worldView.x + cam.width / 2;
    const cy = cam.worldView.y + cam.height / 2;

    this.menuContainer = this.scene.add.container(0, 0).setDepth(9999);

    const bg = this.scene.add
      .rectangle(cx, cy, cam.width, cam.height, 0x000000, 0.75)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setInteractive();

    this.menuContainer.add(bg);

    const title = this.scene.add.text(cx, cy - 180, "Escolha um Upgrade", {
      fontSize: "40px",
      color: "#ffffff",
      fontStyle: "bold",
      stroke: "#000",
      strokeThickness: 8
    }).setOrigin(0.5);

    this.menuContainer.add(title);

    const options = Phaser.Utils.Array.Shuffle(this.upgrades).slice(0, 3);
    const startX = cx - 280;

    options.forEach((upg, i) => {
      const card = this.scene.add
        .rectangle(startX + 280 * i, cy + 20, 240, 160, 0x1d1d1d)
        .setStrokeStyle(4, 0x00eaff)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      card.setScale(0);

      this.scene.tweens.add({
        targets: card,
        scaleX: 1,
        scaleY: 1,
        ease: "Back.Out",
        duration: 400,
        delay: i * 120,
      });

      const name = this.scene.add.text(card.x, card.y - 45, upg.name, {
        fontSize: "20px",
        color: "#00eaff",
        fontStyle: "bold",
      }).setOrigin(0.5);

      const desc = this.scene.add.text(card.x, card.y + 10, upg.desc, {
        fontSize: "16px",
        color: "#ffffff",
        wordWrap: { width: 200 },
        align: "center"
      }).setOrigin(0.5);

      card.on("pointerdown", () => this.applyUpgrade(upg));

      this.menuContainer.add(card);
      this.menuContainer.add(name);
      this.menuContainer.add(desc);
    });
  }

  applyUpgrade(upgrade) {
    const player = this.scene.player;
    if (!player) return;

    try {
      upgrade.apply(player);
      this.syncPlayerAfterUpgrade(player);
      console.log("UPGRADE:", upgrade.id, player.stats.stats);
    } catch (e) {
      console.error("Upgrade error:", e);
      return;
    }

    if (this.scene?.createFloatingText) {
      this.scene.createFloatingText(
        player.x,
        player.y - 50,
        `+${upgrade.name}`,
        this.getUpgradeColor(upgrade.id)
      );
    }

    this.closeMenu();
  }

  syncPlayerAfterUpgrade(player) {
    player.syncStats?.();

    this.scene.refreshWeaponLoopTiming?.();

    player.scene?.updateHealthBar?.();
    player.scene?.updateXpBar?.();
  }

  closeMenu() {
    const player = this.scene.player;

    if (this.menuContainer) this.menuContainer.destroy();

    this.isMenuOpen = false;

    this.scene.physics.resume();
    if (this.scene.weaponLoopEvent) this.scene.weaponLoopEvent.paused = false;

    player?.unlockInput?.();
  }

  getUpgradeColor(id) {
    if (id.includes("damage")) return "#ff4d4d";
    if (id.includes("crit")) return "#ffd700";
    if (id.includes("armor") || id.includes("shield")) return "#4da6ff";
    if (id.includes("speed")) return "#00ffcc";
    if (id.includes("xp")) return "#a64dff";
    if (id.includes("lifesteal")) return "#ff66cc";

    return "#ffffff";
  }
}
