const FRASCO_CONFIG = {
  VELOCITY: 400,
  LIFESPAN: 400,
  AREA_RADIUS: 60,
  AREA_TICK_RATE: 300,
  BASE_TICKS: 6,
};

function getDebuffColor(type) {
  switch (type) {
    case "fire":
      return 0xff7700;
    case "poison":
      return 0x00aa00;
    case "slow":
      return 0x3366ff;
    default:
      return 0xffffff;
  }
}

export default class WeaponSystem {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.cooldowns = {};
  }

  getStat(key, fallback = 0) {
    if (typeof this.player?.getStat === "function") {
      return this.player.getStat(key, fallback);
    }

    if (typeof this.player?.stats?.get === "function") {
      return this.player.stats.get(key, fallback);
    }

    return this.player?.[key] ?? fallback;
  }

  getCooldownDuration(ms) {
    const globalCD = Math.max(0.1, this.getStat("globalCD", 1));
    const attackSpeed = Math.max(0.1, this.getStat("attackSpeed", 1));
    return Math.max(50, ms * globalCD / attackSpeed);
  }

  dealDamage(enemy, baseDamage) {
    if (this.player?.damageSystem?.dealDamageToEnemy) {
      return this.player.damageSystem.dealDamageToEnemy(enemy, baseDamage);
    }

    enemy?.takeDamage?.(baseDamage * this.getStat("damage", 1));
    return null;
  }

  useWeapon(key) {
    if (!this.player.canAttack) return;

    if (this.cooldowns[key]) return;

    let didAttack = false;

    // Chamar hook de ataque (para passivas como Bastião)
    switch (key) {
      case "frascoInstavel":
        didAttack = this._useFrasco();
        break;
      case "foiceEnferrujada":
        didAttack = this.useFoiceEnferrujada();
        break;
      case "sinoPurificacao":
        didAttack = this._useBell();
        break;
      case "pilarCombustao":
        didAttack = this._usePilarCombustao();
        break;
      default:
        console.warn("⚠️ Arma não reconhecida:", key);
        break;
    }

    if (didAttack) {
      this.player.onAttack?.();
    }
  }

  startCooldown(key, ms) {
    this.cooldowns[key] = true;
    this.scene.time.delayedCall(this.getCooldownDuration(ms), () => {
      this.cooldowns[key] = false;
    });
  }

  resetAllCooldowns() {
    Object.keys(this.cooldowns).forEach((k) => (this.cooldowns[k] = false));
  }

  // ─────────────── FRASCO INSTAVEL ───────────────
  _useFrasco() {

    const scene = this.scene;
    const p = this.player;

    const aoeMultiplier   = this.getStat("aoe", 1);
    const projectileSpeed = this.getStat("projectileSpeed", 1);
    const pierce          = Math.max(0, Math.floor(this.getStat("pierce", 0)));

    const target = scene.getClosestEnemy(450 * aoeMultiplier);
    if (!target) return false;

    if (!scene.textures.exists("flask")) {
      console.error("Textura 'flask' nao encontrada. Verifique o preload().");
      return false;
    }

    const effects      = ["fire", "poison", "slow"];
    const chosenEffect = effects[Math.floor(Math.random() * effects.length)];

    const slowRadiusBonus =
      chosenEffect === "slow"
        ? this.getStat("slowRadiusBonus", 0)
        : 0;

    const finalRadius = (FRASCO_CONFIG.AREA_RADIUS + slowRadiusBonus) * aoeMultiplier;

    const baseAngle  = Phaser.Math.Angle.Between(p.x, p.y, target.x, target.y);
    const spread     = Phaser.Math.FloatBetween(-0.08, 0.08);
    const finalAngle = baseAngle + spread;

    // Dispara a sequencia de animacao de arremesso antes de lancar o projetil
    p.playThrowAnimation?.();

    const flask = scene.physics.add
      .sprite(p.x, p.y, "flask")
      .setDepth(5)
      .setTint(getDebuffColor(chosenEffect));

    flask.effect      = chosenEffect;
    flask.pierceLeft  = pierce;
    flask.hitEnemies  = new Set();

    scene.physics.velocityFromRotation(
      finalAngle,
      FRASCO_CONFIG.VELOCITY * projectileSpeed,
      flask.body.velocity
    );

    flask.setAngularVelocity(300);

    this.startCooldown("frascoInstavel", 1200);

    // colisão com inimigos
    const collider = scene.physics.add.collider(
      flask,
      scene.enemies,
      (f, enemy) => {

        if (!f.active || !enemy || !enemy.active || enemy.isDead) return;
        if (f.hitEnemies.has(enemy)) return;

        f.hitEnemies.add(enemy);

        this._createGroundEffect(
          f.x,
          f.y,
          f.effect,
          finalRadius
        );
        this._applyFlaskDebuff(enemy, f.effect);

        // dentro do collider em _useFrasco, antes de f.destroy()
        const hit = scene.add.graphics().setDepth(999);
        hit.fillStyle(0xffffff, 1);
        hit.fillRect(f.x - 6, f.y - 6, 12, 12);
        scene.tweens.add({
          targets: hit,
          alpha: 0,
          scaleX: 3, scaleY: 3,
          duration: 180,
          ease: 'Stepped',
          easeParams: [3],
          onComplete: () => hit.destroy()
        });

        if (f.pierceLeft > 0) {
          f.pierceLeft--;
          return;
        }

        f.destroy();
        scene.physics.world.removeCollider(collider);
      }
    );

    return true;
  }

  _createGroundEffect(x, y, effect, radius = FRASCO_CONFIG.AREA_RADIUS, options = {}) {
    const scene = this.scene;

    const lifetime = options.lifetime || null;
    const radiusMul = options.radiusMul || 1;
    const finalRadius = (radius || FRASCO_CONFIG.AREA_RADIUS) * radiusMul;

    const durationMultiplier = this.getStat("debuffDurationMultiplier", 1);
    const totalTicks = lifetime
      ? Math.ceil(lifetime / FRASCO_CONFIG.AREA_TICK_RATE)
      : Math.ceil(FRASCO_CONFIG.BASE_TICKS * durationMultiplier);

    const color = getDebuffColor(effect);

    // Círculo de área (mantido)
    const area = scene.add
      .circle(x, y, finalRadius, color, 0.18)
      .setStrokeStyle(2, color, 0.8)
      .setDepth(4);

    // Partículas internas por tipo
    const particleTimers = [];
    const spawnInterval = scene.time.addEvent({
      delay: 300,
      loop: true,
      callback: () => spawnAreaParticles(x, y, finalRadius, effect),
    });
    particleTimers.push(spawnInterval);

    function spawnAreaParticles(cx, cy, r, type) {
      if (type === 'fire') {
        // Faíscas laranjas/amarelas que sobem
        for (let i = 0; i < 4; i++) {
          const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
          const dist = Phaser.Math.FloatBetween(0, r * 0.8);
          const px = cx + Math.cos(angle) * dist;
          const py = cy + Math.sin(angle) * dist;
          const colors = [0xff2200, 0xff6600, 0xffaa00, 0xffff00];
          const spark = scene.add
            .rectangle(px, py, 4, 4, colors[i % colors.length])
            .setDepth(5);

          scene.tweens.add({
            targets: spark,
            y: py - Phaser.Math.Between(12, 28),
            alpha: 0,
            scaleX: 0.3, scaleY: 0.3,
            duration: 350,
            ease: 'Stepped',
            easeParams: [3],
            onComplete: () => spark.destroy(),
          });
        }
      }

      if (type === 'poison') {
        // Bolhinhas verdes que flutuam
        for (let i = 0; i < 3; i++) {
          const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
          const dist = Phaser.Math.FloatBetween(0, r * 0.75);
          const px = cx + Math.cos(angle) * dist;
          const py = cy + Math.sin(angle) * dist;
          const colors = [0x00ff44, 0x44ff88, 0xaaff00];
          const bubble = scene.add
            .circle(px, py, Phaser.Math.Between(3, 6), colors[i % colors.length], 0.8)
            .setDepth(5);

          scene.tweens.add({
            targets: bubble,
            y: py - Phaser.Math.Between(8, 22),
            alpha: 0,
            scale: 0.2,
            duration: 600,
            ease: 'Sine.Out',
            onComplete: () => bubble.destroy(),
          });
        }
      }

      if (type === 'slow') {
        // Flocos de gelo — retângulos finos que giram e caem
        for (let i = 0; i < 3; i++) {
          const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
          const dist = Phaser.Math.FloatBetween(0, r * 0.8);
          const px = cx + Math.cos(angle) * dist;
          const py = cy + Math.sin(angle) * dist;
          const colors = [0xaaeeff, 0x66ccff, 0xffffff];

          // cada floco é feito de 2 retângulos cruzados
          const w = (i % 2 === 0) ? 2 : 6;
          const h = (i % 2 === 0) ? 6 : 2;
          const flake = scene.add
            .rectangle(px, py, w, h, colors[i % colors.length])
            .setDepth(5)
            .setAngle(Phaser.Math.Between(0, 90));

          scene.tweens.add({
            targets: flake,
            y: py + Phaser.Math.Between(6, 18), // cai levemente
            angle: flake.angle + Phaser.Math.Between(30, 90),
            alpha: 0,
            duration: 700,
            ease: 'Stepped',
            easeParams: [4],
            onComplete: () => flake.destroy(),
          });
        }
      }
    }

    // Pulso periódico na borda do círculo
    const pulseTimer = scene.time.addEvent({
      delay: 600,
      loop: true,
      callback: () => {
        if (!area.active) return;
        scene.tweens.add({
          targets: area,
          scaleX: 1.06, scaleY: 1.06,
          duration: 150,
          yoyo: true,
          ease: 'Stepped',
          easeParams: [2],
        });
      },
    });
    particleTimers.push(pulseTimer);

    let ticksDone = 0;
    const timer = scene.time.addEvent({
      delay: FRASCO_CONFIG.AREA_TICK_RATE,
      loop: true,
      callback: () => {
        ticksDone++;

        scene.enemies.children.iterate((e) => {
          if (!e || !e.active) return;
          const distance = Phaser.Math.Distance.Between(e.x, e.y, x, y);
          if (distance <= finalRadius) {
            this._applyFlaskDebuff(e, effect);
          }
        });

        if (ticksDone >= totalTicks) {
          area?.destroy();
          particleTimers.forEach(t => t?.remove(false));
          timer.remove(false);
        }
      },
    });
  }

  _applyFlaskDebuff(enemy, effect) {
    const scene = this.scene;
    const baseDotDamage = 10 * (1 + this.getStat("dotDamageBonus", 0));

    switch (effect) {
      case "fire":
        this.dealDamage(enemy, baseDotDamage * 1.5);
        break;
      case "poison":
        this.dealDamage(enemy, baseDotDamage + 2);
        break;
      case "slow":
        // small damage tick for slow, mostly slows the enemy
        this.dealDamage(enemy, Math.max(1, Math.floor(baseDotDamage * 0.1)));

        if (enemy.speed == null && enemy.body && enemy.body.velocity) {
          // try to infer a speed property if missing
          enemy._origSpeed =
            Math.abs(enemy.body.velocity.x) + Math.abs(enemy.body.velocity.y) ||
            100;
          enemy.speed = enemy._origSpeed;
        }

        if (!enemy._origSpeed) enemy._origSpeed = enemy.speed;
        // apply slow only if not already slowed beyond target
        const slowFactor = 0.6;
        const minSpeed = 30;
        const targetSpeed = Math.max(enemy._origSpeed * slowFactor, minSpeed);

        if (enemy.speed > targetSpeed) {
          enemy.speed = targetSpeed;

          // restore speed after one tick interval
          scene.time.delayedCall(FRASCO_CONFIG.AREA_TICK_RATE, () => {
            if (enemy.active && enemy.speed < enemy._origSpeed) {
              enemy.speed = enemy._origSpeed;
            }
          });
        }
        break;
    }
  }

  //COVEIRO
  useFoiceEnferrujada() {
    const scene = this.scene;
    const player = this.player;
    if (!scene || !player) return false;

    // Bônus da Ascensão da Carcaça
    let damageMultiplier = 1;
    let controlTime = 2000;

    if (player.isInAscension) {
      damageMultiplier = 1.5;
      controlTime = 3000;

      // Veneno mais forte a partir da 3ª ascensão
      if (player.ascensionCount >= 3) {
        player.extraVenomBonus = 1.5;
      }
    }

    if (this.cooldowns["foiceEnferrujada"]) return false;
    const attackRange = 450 * this.getStat("aoe", 1);
    const firstTarget = scene.getClosestEnemy(attackRange);
    if (!firstTarget) return false;

    this.startCooldown("foiceEnferrujada", 2500);

    const spawnAngle = Phaser.Math.Angle.Between(
      player.x,
      player.y,
      firstTarget.x,
      firstTarget.y
    );

    const foice = scene.add
      .sprite(
        player.x + Math.cos(spawnAngle) * 28,
        player.y + Math.sin(spawnAngle) * 28,
        scene.textures.exists("foiceGirando") ? "foiceGirando" : "foiceSprite"
      )
      .setDepth(6)
      .setOrigin(0.5)
      .setScale(0.72);

    // Executar animação de rotação
    if (scene.textures.exists("foiceGirando") && scene.anims.exists("foiceGirandoAnim")) {
      foice.play("foiceGirandoAnim");
    }

    scene.physics.add.existing(foice);
    foice.body.setAllowGravity(false);
    if (foice.body.setSize) foice.body.setSize(36, 36);
    foice.body.isSensor = true;

    const SPEED = 420 * this.getStat("projectileSpeed", 1);
    foice.isControlling = true;

    let aimOffset = Phaser.Math.FloatBetween(-0.12, 0.12);
    let returning = false;
    let followTimer = null;
    let aimTimer = null;

    const returnFoice = () => {
      if (returning || !foice.active) return;
      returning = true;

      foice.isControlling = false;
      followTimer?.remove(false);
      aimTimer?.remove(false);

      if (foice.body) foice.body.setVelocity(0, 0);

      scene.tweens.add({
        targets: foice,
        x: player.x,
        y: player.y,
        duration: 320,
        ease: "Sine.easeInOut",
        onUpdate: () => {
          foice.rotation += 0.25;
        },
        onComplete: () => {
          if (foice && foice.destroy) foice.destroy();
        },
      });
    };

    const updateFoice = () => {
      if (!foice.isControlling || !foice.active) return;

      const target = scene.getClosestEnemy(attackRange);
      if (!target) {
        returnFoice();
        return;
      }

      const angle = Phaser.Math.Angle.Between(
        foice.x,
        foice.y,
        target.x,
        target.y
      ) + aimOffset;

      foice.rotation = angle;
      scene.physics.velocityFromRotation(angle, SPEED, foice.body.velocity);
    };

    aimTimer = scene.time.addEvent({
      delay: 400,
      loop: true,
      callback: () => {
        aimOffset = Phaser.Math.FloatBetween(-0.12, 0.12);
      }
    });

    followTimer = scene.time.addEvent({
      delay: 16,
      loop: true,
      callback: updateFoice,
    });

    // 🎯 EFEITO AO ACERTAR INIMIGOS
    scene.physics.add.overlap(foice, scene.enemies, (f, enemy) => {
      if (returning) return;
      if (!enemy || !enemy.active || enemy.isDead) return;

      const damage =
        5 *
        (1 + this.getStat("dotDamageBonus", 0)) *
        (player.extraVenomBonus || 1) *
        damageMultiplier;
      this.dealDamage(enemy, damage);
      enemy.isMarked = true;

      // Adiciona marcador visual acima do inimigo
      if (!enemy.markIndicator || !enemy.markIndicator.active) {
        let icon = null;
        if (scene.textures.exists("markIcon")) {
          icon = scene.add
            .sprite(enemy.x, enemy.y - 24, "markIcon")
            .setDepth(12)
            .setScale(0.5)
            .setTint(0xaa55ff)
            .setAlpha(0.9);
        } else {
          icon = scene.add
            .text(enemy.x, enemy.y - 24, "☠️", {
              fontSize: "16px",
              color: "#bb55ff",
              stroke: "#000000",
              strokeThickness: 3,
            })
            .setOrigin(0.5)
            .setDepth(12)
            .setAlpha(0.9);
        }

        enemy.markIndicator = icon;

        // Faz a caveirinha seguir o inimigo
        const follow = scene.time.addEvent({
          delay: 30,
          loop: true,
          callback: () => {
            if (!enemy || !enemy.active || enemy.isDead) {
              if (enemy && enemy.markIndicator) {
                enemy.markIndicator.destroy();
                enemy.markIndicator = null;
              }
              follow.remove();
              return;
            }
            if (enemy.markIndicator && enemy.markIndicator.active)
              enemy.markIndicator.setPosition(enemy.x, enemy.y - 24);
          },
        });
      }

      // Dano periódico (putrefação)
      if (!enemy.putrefactionTimer) {
        enemy.putrefactionTimer = scene.time.addEvent({
          delay: 900,
          loop: true,
          callback: () => {
            if (!enemy || !enemy.active || enemy.isDead) {
              if (enemy && enemy.putrefactionTimer) {
                enemy.putrefactionTimer.remove(false);
                enemy.putrefactionTimer = null;
              }
              if (enemy && enemy.markIndicator) {
                enemy.markIndicator.destroy();
                enemy.markIndicator = null;
              }
              return;
            }

            this.dealDamage(enemy, 5 * (1 + this.getStat("dotDamageBonus", 0)));
            if (enemy.setTint) enemy.setTint(0x4d7d47);
            scene.time.delayedCall(120, () => {
              if (enemy && enemy.active && enemy.clearTint) enemy.clearTint();
            });
          },
        });
      }

      // Lentidão temporária
      if (!enemy._origSpeed) enemy._origSpeed = enemy.speed;
      enemy.speed = Math.max(enemy._origSpeed * 0.7, 30);
      scene.time.delayedCall(2000, () => {
        if (enemy && enemy.active) enemy.speed = enemy._origSpeed;
      });
    });

    // 🔁 Retorno da foice
    scene.time.delayedCall(controlTime, () => {
      if (!foice.active) return;
      returnFoice();
    });

    return true;
  }

  // ─────────────── 🔔 SENTINELA ───────────────
  _useBell() {
    const scene = this.scene;
    const p = this.player;
    const radius = 120 * this.getStat("aoe", 1);
    const wave = scene.add.circle(p.x, p.y, radius, 0x66ccff, 0.18).setDepth(4);
    scene.enemies.children.iterate((e) => {
      if (!e || !e.active) return;
      const d = Phaser.Math.Distance.Between(e.x, e.y, p.x, p.y);
      if (d <= radius) {
        const angle = Phaser.Math.Angle.Between(p.x, p.y, e.x, e.y);
        const kb = 300 * this.getStat("knockback", 1);
        scene.physics.velocityFromRotation(angle, kb, e.body.velocity);
        const extra = p.extraDamageOnPush || 0;
        this.dealDamage(e, 12 + extra);
        scene.events.emit("enemyPushed", e);
      }
    });
    this.startCooldown("sinoPurificacao", 1400);
    scene.time.delayedCall(260, () => {
      if (wave && wave.destroy) wave.destroy();
    });

    return true;
  }

  // ─────────────── ⚙️ BASTIÃO: PILAR DE COMBUSTÃO ───────────────
  _usePilarCombustao() {
    const scene = this.scene;
    const p = this.player;
    const heat = Phaser.Math.Clamp(p.currentHeat || 0, 0, 100);
    const heatBonus = 1 + heat * 0.006;
    const baseDamage = 18 * heatBonus;

    // Parametrização: raio e duração (aumentada para melhor visibilidade)
    const radius = 115 * this.getStat("aoe", 1);
    const DURATION_MS = 760;
    const isOverheated = (p.tempDamageBoost || 1) > 1;
    const areaColor = isOverheated ? 0xff2200 : 0xff6600;
    const strokeColor = isOverheated ? 0xffdd66 : 0xffaa33;

    if (!scene.getClosestEnemy(radius)) return false;

    // Centro no hitbox do jogador (efeito alinhado ao corpo)
    const getPlayerCenter = () => ({
      x: p.body?.center?.x ?? p.x,
      y: p.body?.center?.y ?? p.y,
    });

    const { x: centerX, y: centerY } = getPlayerCenter();

    // Visual persistente da área enquanto ativo
    const area = scene.add.circle(centerX, centerY, radius, areaColor, 0.18).setDepth(5);
    area.setStrokeStyle(2, strokeColor, 0.7);

    // Tween de pulso sutil para visibilidade
    const pulse = scene.tweens.add({
      targets: area,
      scaleX: 1.06,
      scaleY: 1.06,
      duration: 300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Hit tracking para evitar múltiplos acertos por inimigo na mesma ativação
    const hitSet = new Set();

    // Atualiza posição do visual para seguir o centro do hitbox do jogador
    const follow = () => {
      if (area.active) {
        const { x, y } = getPlayerCenter();
        area.setPosition(x, y);
      }
    };
    scene.events.on('update', follow);

    // Verificação periódica de colisão (mais confiável que checar instantaneamente)
    const tick = scene.time.addEvent({
      delay: 60,
      loop: true,
      callback: () => {
        const { x: centerX, y: centerY } = getPlayerCenter();
        scene.enemies.children.iterate((e) => {
          if (!e || !e.active || e.isDead) return;
          if (hitSet.has(e)) return;
          const d = Phaser.Math.Distance.Between(e.x, e.y, centerX, centerY);
          if (d <= radius) {
            hitSet.add(e);
            this.dealDamage(e, baseDamage);

            // Explosão visual ao acertar
            const explosion = scene.add.graphics().setDepth(6);
            scene.tweens.add({
              targets: explosion,
              duration: 200,
              onUpdate: (tween) => {
                const r = 36 * tween.progress;
                explosion.clear();
                explosion.fillStyle(areaColor, 0.45 - 0.45 * tween.progress);
                explosion.fillCircle(e.x, e.y, r);
              },
              onComplete: () => explosion.destroy()
            });

            const spark = scene.add
              .rectangle(e.x, e.y, 8, 8, strokeColor, 0.95)
              .setDepth(7);
            scene.tweens.add({
              targets: spark,
              y: e.y - 26,
              alpha: 0,
              scaleX: 0.25,
              scaleY: 0.25,
              duration: 220,
              ease: 'Cubic.Out',
              onComplete: () => spark.destroy()
            });
          }
        });
      }
    });

    // Marca se algo foi acertado para feedback
    let hitAny = false;
    const hitObserver = scene.time.addEvent({
      delay: 30,
      loop: true,
      callback: () => { if (hitSet.size > 0) hitAny = true; }
    });

    // Encerrar o efeito após DURATION_MS
    scene.time.delayedCall(DURATION_MS, () => {
      tick.remove(false);
      hitObserver.remove(false);
      pulse.remove();
      scene.events.off('update', follow);
      if (!hitAny) {
        const { x: missX, y: missY } = getPlayerCenter();
        const missEffect = scene.add.graphics({ x: 0, y: 0 }).setDepth(4);
        missEffect.lineStyle(3, strokeColor, 0.7);
        missEffect.strokeCircle(missX, missY, radius);
        scene.tweens.add({ targets: missEffect, alpha: 0, duration: 300, ease: 'Cubic.easeOut', onComplete: () => missEffect.destroy() });
      }
      if (area && area.destroy) area.destroy();
    });

    // Golpe também gera calor (feedback mecânico)
    this.startCooldown("pilarCombustao", 1200);
    return true;
  }
}
