import ShopSystem from "../systems/ShopSystem.js";

export default class ShopScene extends Phaser.Scene {
  constructor() {
    super({ key: "ShopScene" });
    this.selectedCategory = "all";
    this.categoryButtons = [];
  }

  create() {
    this.shop = new ShopSystem(this);
    this.cameras.main.setBackgroundColor("#09121b");

    const width = this.scale.width;
    const height = this.scale.height;

    this.titleText = this.add
      .text(width / 2, 40, "LOJA", {
        fontSize: "40px",
        fill: "#00ffff",
        fontStyle: "bold",
        stroke: "#000",
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.subtitleText = this.add
      .text(width / 2, 80, "Compre cosméticos, boosts e vantagens com moedas.", {
        fontSize: "16px",
        fill: "#ffffff",
      })
      .setOrigin(0.5);

    this.categories = [
      { id: "all", label: "TODOS" },
      { id: "cosmetico", label: "COSMÉTICOS" },
      { id: "consumivel", label: "CONSUMÍVEIS" },
      { id: "skin", label: "SKINS" },
      { id: "powerup", label: "POWER-UPS" },
    ];

    const buttonStartX = 60;
    const buttonY = 120;
    const buttonWidth = 130;
    const buttonSpacing = 15;

    this.categories.forEach((category, index) => {
      const x = buttonStartX + index * (buttonWidth + buttonSpacing);
      const button = this.add
        .rectangle(x, buttonY, buttonWidth, 34, 0x14324a, 0.95)
        .setOrigin(0, 0.5)
        .setStrokeStyle(2, 0x00eaff)
        .setInteractive({ useHandCursor: true });

      const buttonText = this.add
        .text(x + buttonWidth / 2, buttonY, category.label, {
          fontSize: "14px",
          fill: "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      button.on("pointerdown", () => {
        this.selectedCategory = category.id;
        this.updateCategoryButtons();
        this.refreshUI();
      });

      this.categoryButtons.push({ button, buttonText, category });
    });

    this.categoryTitle = this.add
      .text(width / 2, 160, "TODOS OS ITENS", {
        fontSize: "18px",
        fill: "#a4ffc4",
      })
      .setOrigin(0.5);

    const backButton = this.add
      .text(width - 20, 20, "VOLTAR", {
        fontSize: "18px",
        fill: "#ffff00",
        fontStyle: "bold",
        stroke: "#000",
        strokeThickness: 4,
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });

    backButton.on("pointerdown", () => {
      this.scene.start("MenuScene");
    });

    this.coinText = this.add.text(60, 190, "", {
      fontSize: "22px",
      fill: "#ffffff",
      fontStyle: "bold",
    });

    this.messageText = this.add.text(60, 220, "", {
      fontSize: "16px",
      fill: "#a4ffc4",
      wordWrap: { width: width - 120 },
    });

    this.scrollAreaTop = 260;
    this.scrollAreaHeight = height - this.scrollAreaTop - 20;
    this.scrollY = 0;
    this.maxScroll = 0;

    this.itemsContainer = this.add.container(0, this.scrollAreaTop);

    const maskShape = this.add.graphics();
    maskShape.fillStyle(0xffffff, 1);
    maskShape.fillRect(0, this.scrollAreaTop, width, this.scrollAreaHeight);
    maskShape.setVisible(false);
    const mask = maskShape.createGeometryMask();
    this.itemsContainer.setMask(mask);

    this.input.on("pointerdown", (pointer) => {
      if (pointer.y >= this.scrollAreaTop && pointer.y <= this.scrollAreaTop + this.scrollAreaHeight) {
        this.isDragging = true;
        this.dragStartY = pointer.y;
        this.startScrollY = this.scrollY;
      }
    });

    this.input.on("pointermove", (pointer) => {
      if (this.isDragging) {
        const delta = pointer.y - this.dragStartY;
        this.setScroll(this.startScrollY + delta);
      }
    });

    this.input.on("pointerup", () => {
      this.isDragging = false;
    });

    this.input.on("pointerupoutside", () => {
      this.isDragging = false;
    });

    this.input.on("wheel", (pointer, gameObjects, deltaX, deltaY) => {
      if (pointer.y >= this.scrollAreaTop && pointer.y <= this.scrollAreaTop + this.scrollAreaHeight) {
        this.setScroll(this.scrollY - deltaY * 0.5);
      }
    });

    this.updateCategoryButtons();
    this.refreshUI();
  }

  updateCategoryButtons() {
    this.categoryButtons.forEach(({ button, buttonText, category }) => {
      const selected = category.id === this.selectedCategory;
      button.setFillStyle(selected ? 0x00eaff : 0x14324a);
      buttonText.setColor(selected ? "#000000" : "#ffffff");
    });
  }

  setScroll(scrollY) {
    this.scrollY = Phaser.Math.Clamp(scrollY, -this.maxScroll, 0);
    this.itemsContainer.setY(this.scrollAreaTop + this.scrollY);
  }

  refreshUI(message = "") {
    this.scrollY = 0;

    const state = this.shop.getState();
    const shopItems = this.shop.getShopItems(this.selectedCategory);

    this.coinText.setText(`Saldo: ${state.coinBalance} Moedas`);
    this.categoryTitle.setText(
      this.selectedCategory === "all"
        ? "TODOS OS ITENS"
        : `ÁREA: ${this.categories.find((cat) => cat.id === this.selectedCategory).label}`
    );
    this.messageText.setText(message);

    this.itemsContainer.removeAll(true);
    const width = this.scale.width;
    const spacing = 190;

    const contentHeight = shopItems.length > 0 ? (shopItems.length - 1) * spacing + 165 : 0;
    this.maxScroll = Math.max(0, contentHeight - this.scrollAreaHeight);
    this.setScroll(this.scrollY);

    if (shopItems.length === 0) {
      const emptyText = this.add
        .text(width / 2, 90, "Nenhum item disponível nesta categoria.", {
          fontSize: "18px",
          fill: "#ffcc00",
        })
        .setOrigin(0.5);

      this.itemsContainer.add(emptyText);
      return;
    }

    shopItems.forEach((item, index) => {
      const rowY = index * spacing;
      const card = this.add
        .rectangle(width / 2, rowY + 90, width - 120, 150, 0x111b2c, 0.96)
        .setStrokeStyle(2, 0x00eaff)
        .setOrigin(0.5);

      const spriteArea = this.add
        .rectangle(90, rowY + 90, 120, 120, 0x0d1c2e, 0.98)
        .setStrokeStyle(2, 0x00eaff)
        .setOrigin(0.5);

      const spriteLabel = this.add.text(spriteArea.x, spriteArea.y, "SPRITE", {
        fontSize: "14px",
        fill: "#a4f5ff",
        align: "center",
      }).setOrigin(0.5);

      const name = this.add.text(160, rowY + 40, item.name, {
        fontSize: "22px",
        fill: "#00ffff",
        fontStyle: "bold",
      }).setOrigin(0, 0);

      const desc = this.add.text(160, rowY + 76, item.desc, {
        fontSize: "16px",
        fill: "#ffffff",
        wordWrap: { width: width - 420 },
      }).setOrigin(0, 0);

      const price = this.add.text(width - 150, rowY + 50, `${item.price} Moedas`, {
        fontSize: "20px",
        fill: "#ffff00",
        fontStyle: "bold",
      }).setOrigin(0.5);

      const buttonLabel = this.shop.isPurchased(item.id)
        ? "COMPRADO"
        : this.shop.canAfford(item.id)
        ? "COMPRAR"
        : "SEM SALDO";

      const buttonColor = this.shop.isPurchased(item.id)
        ? 0x444444
        : this.shop.canAfford(item.id)
        ? 0x00aa00
        : 0x882222;

      const button = this.add
        .rectangle(width - 150, rowY + 110, 160, 40, buttonColor)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      const buttonText = this.add.text(button.x, button.y, buttonLabel, {
        fontSize: "18px",
        fill: "#ffffff",
        fontStyle: "bold",
      }).setOrigin(0.5);

      if (!this.shop.isPurchased(item.id) && this.shop.canAfford(item.id)) {
        button.on("pointerdown", () => {
          const purchased = this.shop.purchaseItem(item.id);
          if (purchased) {
            this.refreshUI(`Você comprou ${item.name}!`);
          } else {
            this.refreshUI("Não foi possível completar a compra.");
          }
        });
      }

      this.itemsContainer.add([card, spriteArea, spriteLabel, name, desc, price, button, buttonText]);
    });
  }
}
