import PassiveAlquimista from "../../systems/PassiveSystem/PassiveAlquimista.js";
import PassiveCoveiro from "../../systems/PassiveSystem/PassiveCoveiro.js";
import PassiveBastiao from "../../systems/PassiveSystem/PassiveBastiao.js";

export const PLAYER_CLASSES = {
  alquimista: {
    key: "alquimista",
    texture: "alquimista",
    frame: 0,

    stats: {
      maxHP: 90,
      critChance: 0.05,
      critDamage: 1.6,
      projectileSpeed: 1.1,
      globalCD: 0.95,
      aoe: 1.15,
      xpGain: 1.1,
      pickupRadius: 1.3,
      dotDamageBonus: 0.15,
      debuffDurationMultiplier: 1.2,
      auraRange: 120
    },

animations: {
  idle: { start: 0, end: 0, frameRate: 1, repeat: -1 },
  walk: { start: 0, end: 7, frameRate: 7, repeat: -1 }
},
    passive: PassiveAlquimista,
    weaponKey: "frascoInstavel",
    spriteWidth: 120,
    spriteHeight: 200,
    hitboxWidth: 120,
    hitboxHeight: 200,
    spriteScale: 1
  },

  coveiro: {
    key: "coveiro",
    texture: "coveiro",
    frame: 0,

    stats: {
      maxHP: 120,
      armor: 2,
      lifesteal: 0.05,
      dotDamageBonus: 0.3,
      debuffDurationMultiplier: 1.4,
      auraRange: 110
    },

    animations: {
      idle: { start: 0, end: 0, frameRate: 1, repeat: -1 },
      walk: { start: 0, end: 13, frameRate: 8, repeat: -1 }
    },

    passive: PassiveCoveiro,
    weaponKey: "foiceEnferrujada",
    spriteWidth: 10,
    spriteHeight: 10,
    hitboxWidth: 200,
    hitboxHeight: 200,
    spriteScale: 0.8
  },

  bastiao: {
    key: "bastiao",
    texture: "bastiao",
    frame: 1,
    damageMultiplier: 0.45,

    stats: {
      maxHP: 240,
      armor: 8,
      damage: 0.45,
      damageMultiplier: 0.45,
      attackSpeed: 0.65,
      auraRange: 140
    },

    animations: {
      idle: { start: 1, end: 4, frameRate: 3, repeat: -1 },
      walk: { start: 12, end: 19, frameRate: 8, repeat: -1 }
    },

    passive: PassiveBastiao,
    weaponKey: "pilarCombustao",
    spriteWidth: 128,
    spriteHeight: 128,
    hitboxWidth: 58,
    hitboxHeight: 78,
    spriteScale: 0.72
  }
};
