import CoinSystem from "./CoinSystem.js";

const STORAGE_KEY = "chaosRushShopStateV1";

const SHOP_ITEMS = [
  {
    id: "skin_caos",
    name: "Skin Caos Eterno",
    desc: "Desbloqueie uma aparência única para seu personagem.",
    price: 500,
    type: "skin",
  },
  {
    id: "traco_neon",
    name: "Traço Neon",
    desc: "Rastro neon que acompanha seu personagem em movimento.",
    price: 300,
    type: "cosmetico",
  },
  {
    id: "spray_chaos",
    name: "Spray do Caos",
    desc: "Marque suas vitórias com um spray exclusivo.",
    price: 250,
    type: "cosmetico",
  },
  {
    id: "emote_vitoria",
    name: "Emote Vitória",
    desc: "Mostre estilo ao ganhar uma partida.",
    price: 350,
    type: "cosmetico",
  },
  {
    id: "boost_xp",
    name: "Boost de XP",
    desc: "Ganha +50% de XP na próxima partida.",
    price: 300,
    type: "consumivel",
  },
  {
    id: "vida_extra",
    name: "Vida Extra",
    desc: "Comece a próxima partida com +30 HP.",
    price: 250,
    type: "consumivel",
  },
  {
    id: "frasco_poderoso",
    name: "Frasco Poderoso",
    desc: "Aumenta o dano do frasco em 20% para a próxima partida.",
    price: 400,
    type: "powerup",
  },
  {
    id: "borda_lendaria",
    name: "Borda Lendária",
    desc: "Adicione uma borda exclusiva ao seu perfil de jogador.",
    price: 350,
    type: "cosmetico",
  },
];

function safeParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

export default class ShopSystem {
  constructor(scene) {
    this.scene = scene;
    this.coinSystem = new CoinSystem(scene);
    this.state = this.loadState();
  }

  loadState() {
    if (typeof window === "undefined" || !window.localStorage) {
      return this.createInitialState();
    }

    const raw = window.localStorage.getItem(STORAGE_KEY);
    const state = safeParse(raw, null);

    if (!state || typeof state.coinBalance !== "number") {
      return this.createInitialState();
    }

    return {
      ...this.createInitialState(),
      ...state,
    };
  }

  saveState() {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.warn("ShopSystem: não foi possível salvar estado", error);
    }
  }

  createInitialState() {
    return {
      purchased: [],
    };
  }

  getShopItems(filterType = "all") {
    if (filterType === "all") {
      return SHOP_ITEMS;
    }
    return SHOP_ITEMS.filter((item) => item.type === filterType);
  }

  getCoinBalance() {
    return this.coinSystem.getCoinBalance();
  }

  isPurchased(itemId) {
    return this.state.purchased.includes(itemId);
  }

  canAfford(itemId) {
    const item = this.getShopItems().find(i => i.id === itemId);
    return item && this.coinSystem.canAfford(item.price);
  }

  purchaseItem(itemId) {
    const item = this.getShopItems().find(i => i.id === itemId);
    if (!item) return false;
    if (this.isPurchased(itemId)) return false;
    if (!this.coinSystem.canAfford(item.price)) return false;

    const spent = this.coinSystem.spendCoins(item.price);
    if (!spent) return false;

    this.state.purchased.push(itemId);
    this.saveState();
    return true;
  }

  getState() {
    return {
      coinBalance: this.coinSystem.getCoinBalance(),
      purchased: [...this.state.purchased],
      shopItems: this.getShopItems(),
    };
  }
}
