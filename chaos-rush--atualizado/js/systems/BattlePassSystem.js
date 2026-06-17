const STORAGE_KEY = "chaosRushBattlePassStateV1";
const PASS_LEVELS = 50;
const DAILY_MISSIONS_PER_DAY = 4;

const MISSION_TEMPLATES = [
  { id: "killEnemies", description: "Derrote 20 inimigos", target: 20, rewardXp: 140 },
  { id: "collectXP", description: "Colete 40 orbes de XP", target: 40, rewardXp: 140 },
  { id: "useSkills", description: "Use 5 habilidades especiais", target: 5, rewardXp: 140 },
  { id: "surviveTime", description: "Sobreviva 120 segundos em uma partida", target: 120, rewardXp: 180 },
  { id: "runComplete", description: "Complete 1 partida", target: 1, rewardXp: 160 },
];

const LEVEL_REWARDS = [
  { level: 1, title: "Borda Neon", type: "cosmético" },
  { level: 2, title: "Spray Caótico", type: "cosmético" },
  { level: 3, title: "Cor Alternativa: Alquimista", type: "skin" },
  { level: 4, title: "250 Moedas", type: "moeda" },
  { level: 5, title: "Efeito de Habilidade", type: "cosmético" },
  { level: 6, title: "Cor Alternativa: Coveiro", type: "skin" },
  { level: 7, title: "Fragmento de Skin", type: "fragmento" },
  { level: 8, title: "Borda Gelada", type: "cosmético" },
  { level: 9, title: "300 Moedas", type: "moeda" },
  { level: 10, title: "Skin Única: Radiante", type: "skin" },
  { level: 11, title: "Cor Alternativa: Sentinela", type: "skin" },
  { level: 12, title: "400 Moedas", type: "moeda" },
  { level: 13, title: "Emote Vitória", type: "cosmético" },
  { level: 14, title: "Cor Alternativa: Místico", type: "skin" },
  { level: 15, title: "Personagem Novo: A Umbra", type: "personagem" },
  { level: 16, title: "450 Moedas", type: "moeda" },
  { level: 17, title: "Borda de Bronze", type: "cosmético" },
  { level: 18, title: "500 Moedas", type: "moeda" },
  { level: 19, title: "Spray Explosão", type: "cosmético" },
  { level: 20, title: "Skin Única: Infernal", type: "skin" },
  { level: 21, title: "Cor Alternativa: Sombra", type: "skin" },
  { level: 22, title: "550 Moedas", type: "moeda" },
  { level: 23, title: "Emote Tempestade", type: "cosmético" },
  { level: 24, title: "Fragmento de Skin", type: "fragmento" },
  { level: 25, title: "Personagem Alternativo: Alquimista Sombrio", type: "personagem" },
  { level: 26, title: "Borda de Plasma", type: "cosmético" },
  { level: 27, title: "600 Moedas", type: "moeda" },
  { level: 28, title: "Cor Alternativa: Dracônica", type: "skin" },
  { level: 29, title: "Spray Caos", type: "cosmético" },
  { level: 30, title: "Skin Única: Guardião", type: "skin" },
  { level: 31, title: "Cor Alternativa: Etérea", type: "skin" },
  { level: 32, title: "650 Moedas", type: "moeda" },
  { level: 33, title: "Emote Chama", type: "cosmético" },
  { level: 34, title: "Fragmento de Skin", type: "fragmento" },
  { level: 35, title: "Personagem Novo: Guardião Prisma", type: "personagem" },
  { level: 36, title: "700 Moedas", type: "moeda" },
  { level: 37, title: "Borda Arco-íris", type: "cosmético" },
  { level: 38, title: "750 Moedas", type: "moeda" },
  { level: 39, title: "Cor Alternativa: Vampírica", type: "skin" },
  { level: 40, title: "Skin Única: Eclipse", type: "skin" },
  { level: 41, title: "Cor Alternativa: Solar", type: "skin" },
  { level: 42, title: "800 Moedas", type: "moeda" },
  { level: 43, title: "Emote Vórtice", type: "cosmético" },
  { level: 44, title: "Fragmento de Skin", type: "fragmento" },
  { level: 45, title: "Personagem Alternativo: Sentinela Arcana", type: "personagem" },
  { level: 46, title: "850 Moedas", type: "moeda" },
  { level: 47, title: "Cor Alternativa: Estelar", type: "skin" },
  { level: 48, title: "900 Moedas", type: "moeda" },
  { level: 49, title: "Spray Vórtice", type: "cosmético" },
  { level: 50, title: "Skin Final Exclusiva: Caos Eterno", type: "skin" },
];

import CoinSystem from "./CoinSystem.js";

function safeParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

export default class BattlePassSystem {
  constructor(scene) {
    this.scene = scene;
    this.coinSystem = new CoinSystem(scene);
    this.state = this.loadState();
    this.resetDailyIfNeeded();
  }

  loadState() {
    if (typeof window === "undefined" || !window.localStorage) {
      return this.createInitialState();
    }

    const raw = window.localStorage.getItem(STORAGE_KEY);
    const state = safeParse(raw, null);

    if (!state || state.seasonId !== "season1") {
      return this.createInitialState();
    }

    return {
      ...this.createInitialState(),
      ...state,
      dailyMissions: Array.isArray(state.dailyMissions) ? state.dailyMissions : this.generateDailyMissions(),
    };
  }

  saveState() {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.warn("BattlePassSystem: não foi possível salvar estado", error);
    }
  }

  createInitialState() {
    return {
      seasonId: "season1",
      level: 1,
      passXp: 0,
      rewardsUnlocked: [],
      lastDailyDate: this.todayString(),
      dailyMissions: this.generateDailyMissions(),
      streakDays: 0,
      completedRuns: 0,
    };
  }

  addCoins(amount) {
    if (!amount || amount <= 0) return;
    this.coinSystem.addCoins(amount);
  }

  getCoinBalance() {
    return this.coinSystem.getCoinBalance();
  }

  todayString() {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  }

  generateDailyMissions() {
    const templates = Phaser.Utils.Array.Shuffle([...MISSION_TEMPLATES]);
    return templates.slice(0, DAILY_MISSIONS_PER_DAY).map((template, index) => ({
      id: `${template.id}_${this.todayString()}_${index}`,
      templateId: template.id,
      description: template.description,
      target: template.target,
      progress: 0,
      rewardXp: template.rewardXp,
      complete: false,
    }));
  }

  resetDailyIfNeeded() {
    const today = this.todayString();
    if (this.state.lastDailyDate !== today) {
      const previous = this.state.lastDailyDate;
      this.state.dailyMissions = this.generateDailyMissions();
      this.state.lastDailyDate = today;
      this.state.streakDays = previous === this.yesterdayString() ? this.state.streakDays + 1 : 1;
      this.saveState();
    }
  }

  yesterdayString() {
    const now = new Date();
    now.setDate(now.getDate() - 1);
    return now.toISOString().slice(0, 10);
  }

  getCurrentLevel() {
    return this.state.level;
  }

  getCurrentXp() {
    return this.state.passXp;
  }

  getXpForLevel(level) {
    return 300 + level * 12;
  }

  getNextLevelXp() {
    return this.getXpForLevel(this.state.level);
  }

  addProgress(amount) {
    if (amount <= 0) return;
    this.state.passXp += Math.floor(amount);
    this.tryLevelUp();
    this.saveState();
  }

  tryLevelUp() {
    while (this.state.level < PASS_LEVELS && this.state.passXp >= this.getXpForLevel(this.state.level)) {
      this.state.passXp -= this.getXpForLevel(this.state.level);
      this.state.level += 1;
      const reward = this.getLevelReward(this.state.level);
      if (reward) {
        this.state.rewardsUnlocked.push(reward.level);
        if (reward.type === "moeda") {
          const found = /([0-9]+)/.exec(reward.title);
          const amount = found ? parseInt(found[1], 10) : 0;
          if (amount > 0) {
            this.addCoins(amount);
          }
        }
      }
    }

    if (this.state.level >= PASS_LEVELS) {
      this.state.passXp = Math.min(this.state.passXp, this.getXpForLevel(PASS_LEVELS));
    }
  }

  getLevelReward(level) {
    return LEVEL_REWARDS.find(item => item.level === level) || null;
  }

  getRewards() {
    return LEVEL_REWARDS;
  }

  getDailyMissions() {
    this.resetDailyIfNeeded();
    return this.state.dailyMissions;
  }

  getMissionSummary() {
    return this.getDailyMissions().map(mission => ({
      description: mission.description,
      progress: mission.progress,
      target: mission.target,
      complete: mission.complete,
    }));
  }

  completeMission(templateId, amount = 1) {
    const mission = this.state.dailyMissions.find(m => m.templateId === templateId && !m.complete);
    if (!mission) return;

    mission.progress = Math.min(mission.target, mission.progress + amount);
    if (mission.progress >= mission.target) {
      mission.complete = true;
      this.addProgress(mission.rewardXp);
    }

    this.saveState();
  }

  notify(event, payload = {}) {
    if (!event) return;

    switch (event) {
      case "enemyKilled":
        this.completeMission("killEnemies", 1);
        this.addProgress(12);
        break;
      case "xpCollected":
        this.completeMission("collectXP", 1);
        this.addProgress(Math.min(18, payload.amount || 10));
        break;
      case "skillUsed":
        this.completeMission("useSkills", 1);
        this.addProgress(15);
        break;
      case "runEnded":
        if (payload.survivedSeconds >= 120) {
          this.completeMission("surviveTime", 1);
          this.addProgress(40);
        }
        this.completeMission("runComplete", 1);
        this.state.completedRuns += 1;
        this.saveState();
        break;
      default:
        break;
    }
  }

  getState() {
    return {
      level: this.state.level,
      passXp: this.state.passXp,
      nextLevelXp: this.getXpForLevel(this.state.level),
      streakDays: this.state.streakDays,
      coinBalance: this.getCoinBalance(),
      dailyMissions: this.getDailyMissions(),
      rewardsUnlocked: [...this.state.rewardsUnlocked],
    };
  }
}
