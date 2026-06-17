import BattlePassSystem from "../systems/BattlePassSystem.js";

export default class BattlePassScene extends Phaser.Scene {
  constructor() {
    super({ key: "BattlePassScene" });
  }

  create() {
    this.battlePass = new BattlePassSystem(this);
    this.cameras.main.setBackgroundColor("#08111f");

    const width = this.scale.width;
    const height = this.scale.height;

    this.add
      .text(width / 2, 40, "PASSE DE BATALHA", {
        fontSize: "38px",
        fill: "#ffdd44",
        fontStyle: "bold",
        stroke: "#000",
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 84, "Complete missões e desbloqueie recompensas épicas.", {
        fontSize: "16px",
        fill: "#ffffff",
        align: "center",
      })
      .setOrigin(0.5);

    const backButton = this.add
      .text(width - 20, 20, "VOLTAR", {
        fontSize: "18px",
        fill: "#00ffff",
        fontStyle: "bold",
        stroke: "#000",
        strokeThickness: 4,
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });

    backButton.on("pointerdown", () => {
      this.scene.start("MenuScene");
    });

    this.createTopSummary(width, height);
    this.createMissionsPanel(width, height);
    this.createRewardsTrack(width, height);
    this.refreshUI();

    this.events.on("wake", this.refreshUI, this);
    this.refreshTimer = this.time.addEvent({
      delay: 1000,
      callback: this.refreshUI,
      callbackScope: this,
      loop: true,
    });

    this.events.once("shutdown", () => {
      this.refreshTimer?.remove(false);
    });
  }

  createTopSummary(width, height) {
    const summaryWidth = width - 80;
    const summaryHeight = 160;
    const x = 40;
    const y = 110;

    const bg = this.add.rectangle(x + summaryWidth / 2, y + summaryHeight / 2, summaryWidth, summaryHeight, 0x0c1b2d, 0.95);
    bg.setStrokeStyle(2, 0x00ffff);

    this.levelText = this.add.text(x + 16, y + 18, "", {
      fontSize: "24px",
      fill: "#ffffff",
      fontStyle: "bold",
    });

    this.coinText = this.add.text(x + 16, y + 50, "", {
      fontSize: "18px",
      fill: "#ffdd55",
      fontStyle: "bold",
    });

    this.currentRewardText = this.add.text(x + 16, y + 82, "", {
      fontSize: "16px",
      fill: "#d4d4ff",
    });

    this.nextRewardText = this.add.text(x + 16, y + 108, "", {
      fontSize: "16px",
      fill: "#a3f2ff",
    });

    this.progressBarBg = this.add.rectangle(x + 16, y + 136, summaryWidth - 32, 18, 0x11243c).setOrigin(0, 0.5);
    this.progressBarFill = this.add.rectangle(x + 16, y + 136, 10, 18, 0x00ccff).setOrigin(0, 0.5);

    this.progressText = this.add.text(x + summaryWidth - 20, y + 136, "", {
      fontSize: "14px",
      fill: "#ffffff",
    }).setOrigin(1, 0.5);
  }

  createMissionsPanel(width, height) {
    const panelWidth = Math.min(520, width * 0.44);
    const panelHeight = height - 310;
    const x = 40;
    const y = 290;

    const bg = this.add.rectangle(x + panelWidth / 2, y + panelHeight / 2, panelWidth, panelHeight, 0x0a162d, 0.95);
    bg.setStrokeStyle(2, 0x00ffff);

    this.missionsTitle = this.add.text(x + 20, y + 20, "Missões Diárias", {
      fontSize: "20px",
      fill: "#ffffff",
      fontStyle: "bold",
    });

    this.missionsText = this.add.text(x + 20, y + 52, "", {
      fontSize: "15px",
      fill: "#d4d4ff",
      wordWrap: { width: panelWidth - 40 },
      lineSpacing: 4,
    });

    this.missionsPanel = this.add.container(0, 0, [bg, this.missionsTitle, this.missionsText]);
  }

  createRewardsTrack(width, height) {
    const panelWidth = Math.min(680, width * 0.52);
    const panelHeight = height - 260;
    const x = width - panelWidth - 40;
    const y = 150;

    const bg = this.add.rectangle(x + panelWidth / 2, y + panelHeight / 2, panelWidth, panelHeight, 0x0a162d, 0.95);
    bg.setStrokeStyle(2, 0x00ffff);

    this.trackTitle = this.add.text(x + 20, y + 20, "Linha de Recompensas", {
      fontSize: "20px",
      fill: "#ffffff",
      fontStyle: "bold",
    });

    this.trackHint = this.add.text(x + 20, y + 46, "Veja os próximos níveis e ganhe cosméticos.", {
      fontSize: "14px",
      fill: "#a4f5f0",
    });

    const trackX = x + 20;
    const trackY = y + 80;
    const trackWidth = panelWidth - 40;
    const trackHeight = panelHeight - 110;

    const maskShape = this.add.graphics();
    maskShape.fillStyle(0xffffff, 1);
    maskShape.fillRect(trackX, trackY, trackWidth, trackHeight);
    const mask = maskShape.createGeometryMask();

    this.trackContainer = this.add.container(trackX, trackY).setMask(mask);
    this.trackContainer.setScrollFactor(0);
    this.trackContainer.setSize(trackWidth, trackHeight);
    this.trackContainer.update = () => {};
    this.trackPanel = { x: trackX, y: trackY, width: trackWidth, height: trackHeight };

    this.add.existing(this.trackContainer);
  }

  refreshUI() {
    const state = this.battlePass.getState();
    const nextXp = state.nextLevelXp;
    const percent = nextXp > 0 ? Math.round((state.passXp / nextXp) * 100) : 100;

    this.levelText.setText(`Nível do Passe: ${state.level}`);
    this.coinText.setText(`Moedas: ${state.coinBalance}`);
    this.currentRewardText.setText(`Recompensa atual: ${this.battlePass.getLevelReward(state.level)?.title || "Sem recompensa"}`);
    this.nextRewardText.setText(
      nextXp > 0
        ? `Próxima recompensa: ${this.battlePass.getLevelReward(state.level + 1)?.title || "N/A"}`
        : "Passe completo!"
    );
    this.progressBarFill.width = Phaser.Math.Clamp((this.progressBarBg.width - 4) * (percent / 100), 8, this.progressBarBg.width - 4);
    this.progressText.setText(`${percent}%`);

    const missions = state.dailyMissions.map((mission, index) => {
      const status = mission.complete ? "COMPLETA" : `${mission.progress}/${mission.target}`;
      return `• ${mission.description} — ${status}`;
    });

    this.missionsText.setText(missions.join("\n\n"));
    this.renderRewardsTrack(state.level, state.rewardsUnlocked);
  }

  renderRewardsTrack(currentLevel, unlockedLevels) {
    this.trackContainer.removeAll(true);

    const visibleRewards = this.getVisibleTrackRewards(currentLevel);
    const itemWidth = 120;
    const itemHeight = 120;
    const spacing = 18;
    const startX = 0;
    const startY = 0;

    visibleRewards.forEach((reward, index) => {
      const x = startX + index * (itemWidth + spacing);
      const isCurrent = reward.level === currentLevel;
      const isUnlocked = unlockedLevels.includes(reward.level);

      const card = this.add.rectangle(x + itemWidth / 2, startY + itemHeight / 2, itemWidth, itemHeight, isCurrent ? 0x1f4b99 : 0x11263a, 0.98);
      card.setStrokeStyle(isCurrent ? 3 : 2, isCurrent ? 0xffd400 : 0x00d8ff);

      const levelTag = this.add.text(x + 12, startY + 12, `N${reward.level}`, {
        fontSize: "14px",
        fill: isCurrent ? "#fff8b0" : "#a4e7ff",
        fontStyle: "bold",
      }).setOrigin(0, 0);

      const title = this.add.text(x + itemWidth / 2, startY + 40, reward.title, {
        fontSize: "12px",
        fill: "#ffffff",
        align: "center",
        wordWrap: { width: itemWidth - 14 },
      }).setOrigin(0.5, 0);

      const typeText = this.add.text(x + itemWidth / 2, startY + 88, reward.type.toUpperCase(), {
        fontSize: "12px",
        fill: isUnlocked ? "#6eff8f" : "#ffb5b5",
        fontStyle: "bold",
      }).setOrigin(0.5, 0.5);

      const statusText = this.add.text(x + itemWidth / 2, startY + 106, isUnlocked ? "DESBLOQUEADO" : isCurrent ? "ATUAL" : "BLOQUEADO", {
        fontSize: "10px",
        fill: isUnlocked ? "#b8ff9b" : "#c3c3ff",
      }).setOrigin(0.5, 0.5);

      this.trackContainer.add([card, levelTag, title, typeText, statusText]);
    });
  }

  getVisibleTrackRewards(currentLevel) {
    const allRewards = this.battlePass.getRewards();
    const currentIndex = allRewards.findIndex((reward) => reward.level === currentLevel);
    const visibleCount = 8;

    if (currentIndex < 0) {
      return allRewards.slice(0, visibleCount);
    }

    const half = Math.floor(visibleCount / 2);
    let start = Math.max(0, currentIndex - half);
    let end = start + visibleCount;

    if (end > allRewards.length) {
      end = allRewards.length;
      start = Math.max(0, end - visibleCount);
    }

    return allRewards.slice(start, end);
  }
}
