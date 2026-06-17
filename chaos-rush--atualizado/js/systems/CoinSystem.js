const COIN_STORAGE_KEY = "chaosRushCoinStateV1";

function safeParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

export default class CoinSystem {
  constructor(scene) {
    this.scene = scene;
    this.state = this.loadState();
  }

  loadState() {
    if (typeof window === "undefined" || !window.localStorage) {
      return this.createInitialState();
    }

    const raw = window.localStorage.getItem(COIN_STORAGE_KEY);
    const state = safeParse(raw, null);

    if (state && typeof state.coinBalance === "number") {
      return {
        ...this.createInitialState(),
        ...state,
      };
    }

    // Tentar migrar moedas de estados antigos, caso existam
    const oldShopRaw = window.localStorage.getItem("chaosRushShopStateV1");
    const oldPassRaw = window.localStorage.getItem("chaosRushBattlePassStateV1");
    const oldShop = safeParse(oldShopRaw, null);
    const oldPass = safeParse(oldPassRaw, null);
    const migratedBalance = Math.max(
      this.createInitialState().coinBalance,
      oldShop?.coinBalance || 0,
      oldPass?.coinBalance || 0
    );

    return {
      ...this.createInitialState(),
      coinBalance: migratedBalance,
    };
  }

  saveState() {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      window.localStorage.setItem(COIN_STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.warn("CoinSystem: não foi possível salvar estado", error);
    }
  }

  createInitialState() {
    return {
      coinBalance: 500,
      lastDailyClaim: null,
    };
  }

  todayString() {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  }

  getCoinBalance() {
    return this.state.coinBalance || 0;
  }

  hasClaimedToday() {
    return this.state.lastDailyClaim === this.todayString();
  }

  addCoins(amount) {
    if (!amount || amount <= 0) return false;
    this.state.coinBalance = (this.state.coinBalance || 0) + Math.floor(amount);
    this.saveState();
    return true;
  }

  spendCoins(amount) {
    if (!amount || amount <= 0) return false;
    if (amount > this.getCoinBalance()) return false;
    this.state.coinBalance -= Math.floor(amount);
    this.saveState();
    return true;
  }

  canAfford(amount) {
    return this.getCoinBalance() >= amount;
  }

  claimDailyCoins(amount = 150) {
    if (this.hasClaimedToday()) return 0;
    const coins = Math.max(0, Math.floor(amount));
    this.state.coinBalance = this.getCoinBalance() + coins;
    this.state.lastDailyClaim = this.todayString();
    this.saveState();
    return coins;
  }

  getState() {
    return {
      coinBalance: this.getCoinBalance(),
      lastDailyClaim: this.state.lastDailyClaim,
    };
  }
}
