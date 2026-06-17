const MAX_HEAT = 100;
const OVERHEAT_DURATION = 6000;
const OVERHEAT_SPEED_BOOST = 1.35;
const OVERHEAT_DAMAGE_BOOST = 1.35;

export default class PassiveBastiao {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;

    this.isOverheating = false;
    this.superReady = false;
    this.overheatEndsAt = 0;

    this.overheatingAura = null;
    this.overheatingCore = null;
    this.overheatingUpdate = null;

    this.tempEvents = [];
    this.takeDamageHandler = null;
    this.attackHandler = null;
  }

  activate() {
    const player = this.player;

    this.reset();

    if (this.scene.passiveSystem.current !== "bastiao") return;

    player.currentHeat = 0;
    player.heatThreshold = MAX_HEAT;
    player.tempSpeedBoost = 1;
    player.tempDamageBoost = 1;

    this.takeDamageHandler = (damage, info = {}) => {
      if (this.scene.passiveSystem.current !== "bastiao") return;

      const rawDamage = Math.max(info.rawAmount ?? damage, damage, 0);
      this.addHeat(Math.max(8, rawDamage * 1.4));
      this.flashHeatVent();
    };

    this.attackHandler = () => {
      if (this.scene.passiveSystem.current !== "bastiao") return;
      this.addHeat(this.isOverheating ? 2 : 4);
    };

    player.onTakeDamage = this.takeDamageHandler;
    player.onAttack = this.attackHandler;

    this.ensureHUD();
    this.updateHUD();
  }

  addHeat(amount) {
    if (this.scene.passiveSystem.current !== "bastiao") return;
    if (this.isOverheating || !amount || amount <= 0) return;

    const player = this.player;
    player.currentHeat = Phaser.Math.Clamp(
      (player.currentHeat || 0) + amount,
      0,
      MAX_HEAT
    );

    if (player.currentHeat >= MAX_HEAT) {
      this.superReady = true;
    }

    this.updateHUD();
  }

  onEnemyKilled() {
    if (this.scene.passiveSystem.current !== "bastiao") return;
    this.addHeat(2);
  }

  activateSuper() {
    if (this.scene.passiveSystem.current !== "bastiao") return false;
    if (!this.superReady || this.isOverheating) return false;

    const scene = this.scene;
    const player = this.player;
    const radius = 230 * (player.getStat ? player.getStat("aoe", 1) : 1);
    const heat = Phaser.Math.Clamp(player.currentHeat || 0, 0, MAX_HEAT);
    const damage = 90 + heat * 0.9;

    this.superReady = false;
    player.currentHeat = MAX_HEAT;
    this.updateHUD();

    const flash = scene.add
      .circle(player.x, player.y, 48, 0xffffff, 0.85)
      .setDepth(999);

    scene.tweens.add({
      targets: flash,
      scale: radius / 24,
      alpha: 0,
      duration: 360,
      ease: "Cubic.Out",
      onComplete: () => flash.destroy()
    });

    const wave = scene.add
      .circle(player.x, player.y, 24, 0xff7722, 0.28)
      .setStrokeStyle(5, 0xffcc66, 0.95)
      .setDepth(998);

    scene.tweens.add({
      targets: wave,
      radius,
      alpha: 0,
      duration: 520,
      ease: "Quad.Out",
      onComplete: () => wave.destroy()
    });

    this.spawnSparks(player.x, player.y, 34, radius);
    scene.cameras.main?.shake(220, 0.012);

    scene.enemies.children.iterate((enemy) => {
      if (!enemy || !enemy.active || enemy.isDead) return;

      const distance = Phaser.Math.Distance.Between(
        enemy.x,
        enemy.y,
        player.x,
        player.y
      );

      if (distance > radius) return;

      if (player.damageSystem?.dealDamageToEnemy) {
        player.damageSystem.dealDamageToEnemy(enemy, damage);
      } else {
        enemy.takeDamage?.(damage);
      }

      if (enemy.body?.velocity) {
        const angle = Phaser.Math.Angle.Between(player.x, player.y, enemy.x, enemy.y);
        scene.physics.velocityFromRotation(angle, 320, enemy.body.velocity);
      }
    });

    this.triggerOverheating();
    return true;
  }

  triggerOverheating() {
    if (this.scene.passiveSystem.current !== "bastiao") return;

    const scene = this.scene;
    const player = this.player;

    this.clearOverheatingVisuals();
    this.isOverheating = true;
    this.overheatEndsAt = scene.time.now + OVERHEAT_DURATION;

    player.tempSpeedBoost = OVERHEAT_SPEED_BOOST;
    player.tempDamageBoost = OVERHEAT_DAMAGE_BOOST;
    player.setTint?.(0xff8844);

    this.overheatingAura = scene.add
      .circle(player.x, player.y, 116, 0xff3300, 0.16)
      .setStrokeStyle(3, 0xffaa33, 0.85)
      .setDepth(3);

    this.overheatingCore = scene.add
      .circle(player.x, player.y, 36, 0xffcc33, 0.18)
      .setDepth(4);

    scene.tweens.add({
      targets: this.overheatingAura,
      scaleX: 1.12,
      scaleY: 1.12,
      alpha: 0.26,
      duration: 360,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

    scene.tweens.add({
      targets: this.overheatingCore,
      scaleX: 1.45,
      scaleY: 1.45,
      alpha: 0.05,
      duration: 240,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

    this.overheatingUpdate = () => {
      if (!this.isOverheating) return;

      this.overheatingAura?.setPosition(player.x, player.y);
      this.overheatingCore?.setPosition(player.x, player.y);
      this.updateHUD();
    };

    scene.events.on("update", this.overheatingUpdate);

    const emberTimer = scene.time.addEvent({
      delay: 180,
      loop: true,
      callback: () => this.spawnSparks(player.x, player.y, 3, 70)
    });

    const endEvent = scene.time.delayedCall(OVERHEAT_DURATION, () => {
      this.endOverheating();
    });

    this.tempEvents.push(emberTimer, endEvent);
    this.updateHUD();
  }

  endOverheating() {
    const player = this.player;

    this.tempEvents.forEach((event) => event?.remove?.(false));
    this.tempEvents = [];

    this.isOverheating = false;
    this.superReady = false;
    this.overheatEndsAt = 0;

    player.currentHeat = 0;
    player.tempSpeedBoost = 1;
    player.tempDamageBoost = 1;
    player.clearTint?.();

    this.clearOverheatingVisuals();
    this.updateHUD();
  }

  ensureHUD() {
    const scene = this.scene;

    if (!scene.passiveBarBg) {
      scene.passiveBarBg = scene.add
        .rectangle(100, 70, 200, 10, 0x222222)
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(1000);
    }

    if (!scene.passiveBar) {
      scene.passiveBar = scene.add
        .rectangle(100, 70, 0, 10, 0xff6600)
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(1001);
    }

    if (!scene.passiveText) {
      scene.passiveText = scene.add
        .text(310, 65, "Calor: 0%", {
          fontSize: "14px",
          fill: "#ffffff"
        })
        .setScrollFactor(0)
        .setDepth(1001);
    }

    scene.passiveBarBg
      ?.setFillStyle?.(0x1a120e, 0.9)
      ?.setScrollFactor?.(0)
      ?.setDepth?.(1000);

    scene.passiveBar
      ?.setFillStyle?.(0xff6600, 1)
      ?.setScrollFactor?.(0)
      ?.setDepth?.(1001);

    scene.passiveText
      ?.setScrollFactor?.(0)
      ?.setDepth?.(1001);
  }

  updateHUD() {
    if (this.scene.passiveSystem.current !== "bastiao") return;

    const scene = this.scene;
    const player = this.player;

    this.ensureHUD();

    let percent = Phaser.Math.Clamp((player.currentHeat || 0) / MAX_HEAT, 0, 1);
    let label = `Calor: ${Math.floor(percent * 100)}%`;
    let color = "#ffffff";
    let barColor = 0xff6600;

    if (this.isOverheating) {
      const remaining = Phaser.Math.Clamp(
        this.overheatEndsAt - scene.time.now,
        0,
        OVERHEAT_DURATION
      );

      percent = remaining / OVERHEAT_DURATION;
      label = `Superaquecido: ${Math.ceil(remaining / 1000)}s`;
      color = "#ffdd66";
      barColor = 0xff3300;
    } else if (this.superReady) {
      percent = 1;
      label = "SUPER pronta (SPACE)";
      color = "#ffcc33";
      barColor = 0xffcc33;
    } else if (percent >= 0.75) {
      color = "#ff8844";
      barColor = 0xff8844;
    }

    if (scene.passiveBar) {
      scene.passiveBar.width = 200 * percent;
      scene.passiveBar.setFillStyle?.(barColor, 1);
    }

    scene.passiveText?.setText(label).setColor(color);
  }

  flashHeatVent() {
    const scene = this.scene;
    const player = this.player;

    const vent = scene.add
      .circle(player.x, player.y - 18, 14, 0xffaa33, 0.45)
      .setDepth(8);

    scene.tweens.add({
      targets: vent,
      y: vent.y - 28,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 260,
      ease: "Cubic.Out",
      onComplete: () => vent.destroy()
    });
  }

  spawnSparks(x, y, count, radius) {
    const scene = this.scene;
    const colors = [0xff3300, 0xff7700, 0xffcc33, 0xffffff];

    for (let i = 0; i < count; i++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(18, radius);
      const spark = scene.add
        .rectangle(x, y, 4, 4, colors[i % colors.length], 0.95)
        .setDepth(999);

      scene.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scaleX: 0.25,
        scaleY: 0.25,
        duration: Phaser.Math.Between(220, 460),
        ease: "Cubic.Out",
        onComplete: () => spark.destroy()
      });
    }
  }

  clearOverheatingVisuals() {
    const scene = this.scene;

    if (this.overheatingUpdate) {
      scene.events.off("update", this.overheatingUpdate);
      this.overheatingUpdate = null;
    }

    if (this.overheatingAura) {
      scene.tweens.killTweensOf(this.overheatingAura);
    }

    if (this.overheatingCore) {
      scene.tweens.killTweensOf(this.overheatingCore);
    }

    this.overheatingAura?.destroy();
    this.overheatingCore?.destroy();
    this.overheatingAura = null;
    this.overheatingCore = null;
  }

  reset() {
    const scene = this.scene;
    const player = this.player;

    if (player.onTakeDamage === this.takeDamageHandler) {
      player.onTakeDamage = null;
    }

    if (player.onAttack === this.attackHandler) {
      player.onAttack = null;
    }

    this.tempEvents.forEach((event) => event?.remove?.(false));
    this.tempEvents = [];

    this.clearOverheatingVisuals();

    player.currentHeat = 0;
    player.tempSpeedBoost = 1;
    player.tempDamageBoost = 1;
    player.clearTint?.();

    this.isOverheating = false;
    this.superReady = false;
    this.overheatEndsAt = 0;
    this.takeDamageHandler = null;
    this.attackHandler = null;

    if (scene.passiveBar) {
      scene.passiveBar.width = 0;
      scene.passiveBar.setFillStyle?.(0xff6600, 1);
    }

    scene.passiveText?.setText("Calor: 0%").setColor("#ffffff");
  }
}
