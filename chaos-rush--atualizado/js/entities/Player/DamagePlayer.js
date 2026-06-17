export default class DamagePlayer {
    constructor(player, stats) {
        this.player = player;
        this.stats = stats;

        const maxHP = this.getStat("maxHP", 100);
        if (typeof this.player.currentHP !== "number") {
            this.player.currentHP = maxHP;
        }
    }

    getStat(key, fallback = 0) {
        if (typeof this.stats?.get === "function") {
            return this.stats.get(key, fallback);
        }

        return this.stats?.[key] ?? fallback;
    }

    setStat(key, value) {
        if (typeof this.stats?.set === "function") {
            this.stats.set(key, value);
            return;
        }

        if (this.stats) this.stats[key] = value;
    }

    takeDamage(amount) {
        const rawAmount = amount;
        let dmg = amount;
        let shieldAbsorbed = 0;

        let shield = this.getStat("shield", 0);
        if (shield > 0) {
            const absorbed = Math.min(shield, dmg);
            shield -= absorbed;
            dmg -= absorbed;
            shieldAbsorbed = absorbed;
            this.setStat("shield", shield);

            if (dmg <= 0) {
                this.player.scene.updateHealthBar?.();
                return;
            }
        }

        const armor = this.getStat("armor", 0);
        dmg = Math.max(1, dmg - armor);

        this.player.currentHP -= dmg;
        this.player.onTakeDamage?.(dmg, {
            rawAmount,
            shieldAbsorbed,
            armor
        });

        this.player.scene.cameras?.main?.shake(100, 0.005);

        if (this.player.currentHP <= 0) {
            this.player.currentHP = 0;
            this.player.die();
        }

        this.player.scene.updateHealthBar?.();
    }

    calculateDamage(baseDamage = 1, options = {}) {
        let dmg = baseDamage * this.getStat("damage", 1);
        dmg *= this.player.tempDamageBoost || 1;

        const critChance = this.getStat("critChance", 0);
        const critDmg = this.getStat("critDamage", 1.5);

        let isCrit = false;
        if (options.forceCrit || options.isCrit || Math.random() < critChance) {
            dmg *= critDmg;
            isCrit = true;
        }

        const doubleHitChance = this.getStat("doubleHit", 0);
        const hits = Math.random() < doubleHitChance ? 2 : 1;

        return {
            damage: dmg,
            hits,
            isCrit
        };
    }

    getKnockback(force) {
        return force * this.getStat("knockback", 1);
    }

    dealDamageToEnemy(enemy, baseDamage = 1, options = {}) {
        if (!enemy || !enemy.active || enemy.isDead) return null;

        const info = this.calculateDamage(baseDamage, options);
        const lifesteal = this.getStat("lifesteal", 0);

        for (let i = 0; i < info.hits; i++) {
            this.player.scene.time.delayedCall(i * 50, () => {
                if (!enemy || !enemy.active || enemy.isDead) return;

                enemy.takeDamage(info.damage, {
                    isCrit: info.isCrit
                });

                if (lifesteal > 0) {
                    this.heal(info.damage * lifesteal);
                }

                if (enemy.applyKnockback) {
                    enemy.applyKnockback(this.getKnockback(50));
                }
            });
        }

        if (info.isCrit) {
            this.player.scene.time.timeScale = 0.2;

            this.player.scene.time.delayedCall(50, () => {
                this.player.scene.time.timeScale = 1;
            });
        }

        return info;
    }

    heal(amount) {
        if (!amount || amount <= 0) return;

        const maxHP = this.player.maxHP ?? this.getStat("maxHP", 100);
        this.player.currentHP = Math.min(maxHP, this.player.currentHP + amount);
        this.player.scene.updateHealthBar?.();
    }

    addShield(amount) {
        if (!amount || amount <= 0) return;

        this.setStat("shield", this.getStat("shield", 0) + amount);
        this.player.scene.updateHealthBar?.();
    }
}
