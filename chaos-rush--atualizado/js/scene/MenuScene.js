import {
  RANKING_MODES,
  fetchRankings,
  normalizeRankingMode
} from "../systems/RankingService.js?v=modo-infinito-4";
import CoinSystem from "../systems/CoinSystem.js";

const GAME_MODE_OPTIONS = [
  { key: RANKING_MODES.FINITE, label: 'Finito' },
  { key: RANKING_MODES.INFINITE, label: 'Infinito' }
];

const SELECTED_MODE_STORAGE_KEY = 'chaos_selected_game_mode';
const RANKING_TAB_STORAGE_KEY = 'chaos_ranking_mode';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  preload() {
    this.load.image('menuBg', 'assets/img/menu-init-1.png');
    this.load.audio('menuMusic', 'assets/music/menu-music1.mp3');
  }

  create() {
    const width = this.scale.width;
    const height = this.scale.height;
    const hasRankingColumn = width >= 1100;
    const isCompact = !hasRankingColumn || height < 760;
    const titleY = isCompact ? 58 : 86;
    const subtitleY = titleY + 48;
    const classPanelX = hasRankingColumn ? width * 0.34 : width / 2;
    const classPanelY = hasRankingColumn ? height / 2 + 38 : Math.min(330, height * 0.43);
    const classPanelWidth = Math.min(hasRankingColumn ? 620 : 760, width - 32);
    const classPanelHeight = hasRankingColumn ? Math.min(520, height - 210) : Math.min(330, height * 0.46);
    const classButtonWidth = Math.max(280, classPanelWidth - 70);
    const classButtonHeight = isCompact ? 66 : 78;
    const classButtonGap = isCompact ? 74 : 88;
    this.selectedGameMode = normalizeRankingMode(
      localStorage.getItem(SELECTED_MODE_STORAGE_KEY) || RANKING_MODES.FINITE
    );

    // Carregar configurações de áudio do localStorage
    this.musicOn = localStorage.getItem('musicOn') !== 'false'; // default true
    this.soundOn = localStorage.getItem('soundOn') !== 'false'; // default true

    // Adicionar música de fundo
    this.music = this.sound.add('menuMusic', { loop: true, volume: 0.5 });
    if (this.musicOn) {
      this.music.play();
    }

    this.bgFar = this.add
      .tileSprite(0, 0, width, height, 'menuBg')
      .setOrigin(0)
      .setScrollFactor(0);

    this.bgNear = this.add
      .tileSprite(0, 0, width, height, 'menuBg')
      .setOrigin(0)
      .setScrollFactor(0)
      .setAlpha(0.35)
      .setDepth(-1);

    this.cameras.main.setBackgroundColor('#080a10');

    this.add
      .text(width / 2, titleY, 'CHAOS RUSH', {
        fontSize: `${Math.min(64, Math.max(40, width * 0.09))}px`,
        fill: '#00ffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(10);

    this.add
      .text(width / 2, subtitleY, 'Fractured Realms', {
        fontSize: `${isCompact ? 16 : 20}px`,
        fill: '#cccccc',
      })
      .setOrigin(0.5)
      .setDepth(10);

    // Botões de configuração de áudio no canto superior direito
    const buttonWidth = 120;
    const buttonHeight = 40;
    const buttonY = 30;
    const musicButtonX = width - buttonWidth - 10;
    const soundButtonX = width - (buttonWidth * 2) - 20;

    // Botão Música
    this.musicButton = this.add
      .rectangle(musicButtonX, buttonY, buttonWidth, buttonHeight, 0x111122, 0.8)
      .setStrokeStyle(2, 0x00ffff)
      .setInteractive({ useHandCursor: true })
      .setDepth(10);

    this.musicText = this.add
      .text(musicButtonX, buttonY, `Música: ${this.musicOn ? 'ON' : 'OFF'}`, {
        fontSize: '16px',
        fill: '#00ffff',
      })
      .setOrigin(0.5)
      .setDepth(11);

    this.musicButton.on('pointerover', () => this.musicButton.setFillStyle(0x00ffff, 0.3));
    this.musicButton.on('pointerout', () => this.musicButton.setFillStyle(0x111122, 0.8));
    this.musicButton.on('pointerdown', () => {
      this.musicOn = !this.musicOn;
      localStorage.setItem('musicOn', this.musicOn);
      this.musicText.setText(`Música: ${this.musicOn ? 'ON' : 'OFF'}`);
      if (this.musicOn) {
        this.music.play();
      } else {
        this.music.stop();
      }
    });

    const shopButtonX = soundButtonX;
    const battlePassButtonX = width - (buttonWidth * 3) - 30;

    this.shopButton = this.add
      .rectangle(shopButtonX, buttonY, buttonWidth, buttonHeight, 0x111122, 0.8)
      .setStrokeStyle(2, 0x00ffff)
      .setInteractive({ useHandCursor: true })
      .setDepth(10);

    this.shopText = this.add
      .text(shopButtonX, buttonY, 'Loja', {
        fontSize: '16px',
        fill: '#00ffff',
      })
      .setOrigin(0.5)
      .setDepth(11);

    this.shopButton.on('pointerover', () => this.shopButton.setFillStyle(0x00ffff, 0.3));
    this.shopButton.on('pointerout', () => this.shopButton.setFillStyle(0x111122, 0.8));
    this.shopButton.on('pointerdown', () => {
      this.scene.start('ShopScene');
    });

    this.battlePassButton = this.add
      .rectangle(battlePassButtonX, buttonY, buttonWidth, buttonHeight, 0x111122, 0.8)
      .setStrokeStyle(2, 0x00ffff)
      .setInteractive({ useHandCursor: true })
      .setDepth(10);

    this.battlePassText = this.add
      .text(battlePassButtonX, buttonY, 'Passe', {
        fontSize: '16px',
        fill: '#00ffff',
      })
      .setOrigin(0.5)
      .setDepth(11);

    this.battlePassButton.on('pointerover', () => this.battlePassButton.setFillStyle(0x00ffff, 0.3));
    this.battlePassButton.on('pointerout', () => this.battlePassButton.setFillStyle(0x111122, 0.8));
    this.battlePassButton.on('pointerdown', () => {
      this.scene.start('BattlePassScene');
    });

    this.coinSystem = new CoinSystem(this);

    this.coinText = this.add.text(20, 30, "", {
      fontSize: '18px',
      fill: '#ffff7f',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 3,
    })
      .setOrigin(0, 0)
      .setDepth(10);

    this.claimButton = this.add
      .rectangle(20, 70, 200, 40, 0x111122, 0.9)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x00ffff)
      .setInteractive({ useHandCursor: true })
      .setDepth(10);

    this.claimText = this.add
      .text(20 + 100, 90, "Ganhar 150 moedas", {
        fontSize: '16px',
        fill: '#00ffff',
      })
      .setOrigin(0.5)
      .setDepth(11);

    this.claimStatusText = this.add.text(230, 80, "", {
      fontSize: '14px',
      fill: '#a4ffc4',
      wordWrap: { width: 240 },
    })
      .setOrigin(0, 0)
      .setDepth(10);

    this.claimButton.on('pointerover', () => this.claimButton.setFillStyle(0x00ffff, 0.3));
    this.claimButton.on('pointerout', () => this.claimButton.setFillStyle(0x111122, 0.9));
    this.claimButton.on('pointerdown', () => {
      const earned = this.coinSystem.claimDailyCoins(150);
      if (earned > 0) {
        this.claimStatusText.setText(`Você ganhou ${earned} moedas! Volte amanhã.`);
      } else {
        this.claimStatusText.setText('Já resgatado hoje. Volte amanhã!');
      }
      this.updateCoinUI();
    });

    this.updateCoinUI();

    // // Botão Som
    // this.soundButton = this.add
    //   .rectangle(soundButtonX, buttonY, buttonWidth, buttonHeight, 0x111122, 0.8)
    //   .setStrokeStyle(2, 0x00ffff)
    //   .setInteractive({ useHandCursor: true })
    //   .setDepth(10);

    // this.soundText = this.add
    //   .text(soundButtonX, buttonY, `Som: ${this.soundOn ? 'ON' : 'OFF'}`, {
    //     fontSize: '16px',
    //     fill: '#00ffff',
    //   })
    //   .setOrigin(0.5)
    //   .setDepth(11);

    // this.soundButton.on('pointerover', () => this.soundButton.setFillStyle(0x00ffff, 0.3));
    // this.soundButton.on('pointerout', () => this.soundButton.setFillStyle(0x111122, 0.8));
    // this.soundButton.on('pointerdown', () => {
    //   this.soundOn = !this.soundOn;
    //   localStorage.setItem('soundOn', this.soundOn);
    //   this.soundText.setText(`Som: ${this.soundOn ? 'ON' : 'OFF'}`);
    //   // Para sons, você pode implementar lógica adicional aqui ou em outras cenas
    // });

    const painel = this.add
      .rectangle(classPanelX, classPanelY, classPanelWidth, classPanelHeight, 0x000000, 0.55)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0x00ffff)
      .setDepth(5);

    const classPanelTop = classPanelY - classPanelHeight / 2;

    this.add
      .text(classPanelX, classPanelTop + (isCompact ? 17 : 24), 'Pronto pra jogar?', {
        fontSize: `${isCompact ? 18 : 24}px`,
        fontStyle: 'bold',
        fill: '#ffff00',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(10); // z-index

    this.modeButtons = [];
    const modeSelectorY = classPanelTop + (isCompact ? 48 : 62);
    const modeButtonWidth = Math.min(150, (classButtonWidth - 18) / 2);
    const modeButtonHeight = isCompact ? 30 : 34;
    const modeGap = modeButtonWidth + 12;

    GAME_MODE_OPTIONS.forEach((mode, index) => {
      const x = classPanelX + (index - 0.5) * modeGap;

      const button = this.add
        .rectangle(x, modeSelectorY, modeButtonWidth, modeButtonHeight, 0x111122, 0.78)
        .setStrokeStyle(2, 0x00ffff)
        .setInteractive({ useHandCursor: true })
        .setDepth(7);

      const text = this.add
        .text(x, modeSelectorY, mode.label, {
          fontSize: `${isCompact ? 13 : 15}px`,
          fill: '#00ffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(8);

      button.on('pointerover', () => {
        if (this.selectedGameMode !== mode.key) button.setFillStyle(0x00ffff, 0.25);
      });
      button.on('pointerout', () => this.updateModeButtons());
      button.on('pointerdown', () => {
        this.selectedGameMode = mode.key;
        localStorage.setItem(SELECTED_MODE_STORAGE_KEY, mode.key);
        this.updateModeButtons();
      });

      this.modeButtons.push({ key: mode.key, button, text });
    });

    this.updateModeButtons();

    const classes = [
      {
        Key: 'alquimista',
        name: 'A Alquimista Espectral',
        desc: 'Manipula frascos instáveis que causam efeitos aleatórios.\nCarregue sua passiva e acabe com seus inimigos.',
      },
      {
        Key: 'coveiro',
        name: 'O Coveiro Profano',
        desc: 'Profana a terra com a Foice Enferrujada, aplicando Podridão e Lentidão aos inimigos.',
      },
      {
        Key: 'bastiao',
        name: 'Bastião de Engrenagens',
        desc: 'Pilar de Combustao: acumula calor ao atacar e receber dano.\nCom 100% de calor, use SPACE para superaquecer.',
        estreia: '',
      },
    ];

    const startY = classPanelTop + (isCompact ? 100 : 136);

    classes.forEach((cls, i) => {
      const btnY = startY + i * classButtonGap;

      const btn = this.add
        .rectangle(classPanelX, btnY, classButtonWidth, classButtonHeight, 0x111122, 0.74)
        .setStrokeStyle(2, 0x00ffff)
        .setInteractive({ useHandCursor: true })
        .setDepth(6);

      this.add
        .text(btn.x, btnY - classButtonHeight * 0.24, cls.name, {
          fontSize: `${isCompact ? 17 : 22}px`,
          fill: '#00ffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(7);

      this.add
        .text(btn.x, btnY + classButtonHeight * 0.18, cls.desc, {
          fontSize: `${isCompact ? 12 : 14}px`,
          fill: '#cccccc',
          align: 'center',
          wordWrap: { width: classButtonWidth - 50 },
        })
        .setOrigin(0.5)
        .setDepth(7);

      btn.on('pointerover', () => btn.setFillStyle(0x00ffff, 0.3));
      btn.on('pointerout', () => btn.setFillStyle(0x111122, 0.7));
      btn.on('pointerdown', () => {
        this.scene.start('MainScene', {
          selectedClassKey: cls.Key,
          selectedGameMode: this.selectedGameMode
        });
      });

      if (cls.estreia) {
        this.add
          .text(btn.x - classButtonWidth / 2 + 14, btnY - classButtonHeight / 2 + 8, cls.estreia, {
            fontSize: `${isCompact ? 13 : 16}px`,
            fill: '#ffff00',
            fontStyle: 'bold',
          })
          .setOrigin(0)
          .setDepth(7);
      }
    });

    this.add
      .text(classPanelX, classPanelY + classPanelHeight / 2 - 28, 'Pressione uma classe para começar!', {
        fontSize: `${isCompact ? 18 : 20}px`,
        fill: '#FFF700',
      })
      .setOrigin(0.5)
      .setDepth(7);

    this.createRankingPanel(width, height, {
      hasRankingColumn,
      classPanelY,
      classPanelHeight,
      isCompact,
    });

    this.scale.on('resize', this.resize, this);
  }

  updateModeButtons() {
    this.modeButtons?.forEach(({ key, button, text }) => {
      const isActive = key === this.selectedGameMode;

      button
        .setFillStyle(isActive ? 0x00ffff : 0x111122, isActive ? 0.24 : 0.78)
        .setStrokeStyle(2, isActive ? 0xfff700 : 0x00ffff);

      text.setColor(isActive ? '#fff700' : '#00ffff');
    });
  }

  createRankingPanel(width, height, layout) {
    const { hasRankingColumn, classPanelY, classPanelHeight, isCompact } = layout;
    const panelWidth = hasRankingColumn ? Math.min(380, width * 0.29) : Math.min(760, width - 32);
    const bottomSpace = height - (classPanelY + classPanelHeight / 2) - 58;
    const panelHeight = hasRankingColumn ? classPanelHeight : Math.max(175, Math.min(235, bottomSpace));
    const panelX = hasRankingColumn ? width * 0.78 : width / 2;
    const panelY = hasRankingColumn
      ? classPanelY
      : Math.min(height - panelHeight / 2 - 14, classPanelY + classPanelHeight / 2 + 48 + panelHeight / 2);

    this.add
      .rectangle(panelX, panelY, panelWidth, panelHeight, 0x000000, 0.64)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0xfff700)
      .setDepth(8);

    this.add.text(panelX, panelY - panelHeight / 2 + 30, 'RANKING', {
      fontSize: `${isCompact ? 20 : 26}px`,
      fill: '#fff700',
      fontStyle: 'bold',
    })
      .setOrigin(0.5)
      .setDepth(9);

    this.rankingMode = normalizeRankingMode(
      localStorage.getItem(RANKING_TAB_STORAGE_KEY) || RANKING_MODES.FINITE
    );
    this.rankingRows = [];
    this.rankingTabs = [];
    this.rankingPanelInfo = {
      panelX,
      panelY,
      panelWidth,
      panelHeight,
      isCompact
    };

    const tabY = panelY - panelHeight / 2 + (isCompact ? 56 : 68);
    const tabWidth = Math.min(132, (panelWidth - 54) / 2);
    const tabHeight = isCompact ? 26 : 30;
    const tabGap = tabWidth + 10;

    GAME_MODE_OPTIONS.forEach((mode, index) => {
      const x = panelX + (index - 0.5) * tabGap;

      const button = this.add
        .rectangle(x, tabY, tabWidth, tabHeight, 0x111122, 0.8)
        .setStrokeStyle(2, 0x00ffff)
        .setInteractive({ useHandCursor: true })
        .setDepth(9);

      const text = this.add
        .text(x, tabY, mode.label, {
          fontSize: `${isCompact ? 12 : 14}px`,
          fill: '#00ffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(10);

      button.on('pointerover', () => {
        if (this.rankingMode !== mode.key) button.setFillStyle(0x00ffff, 0.24);
      });
      button.on('pointerout', () => this.updateRankingTabs());
      button.on('pointerdown', () => this.setRankingMode(mode.key));

      this.rankingTabs.push({ key: mode.key, button, text });
    });

    this.updateRankingTabs();

    const headerY = panelY - panelHeight / 2 + (isCompact ? 84 : 106);
    this.add.text(panelX - panelWidth * 0.42, headerY, '#', {
      fontSize: `${isCompact ? 12 : 14}px`,
      fill: '#00ffff',
      fontStyle: 'bold',
    }).setDepth(9);

    this.add.text(panelX - panelWidth * 0.32, headerY, 'Jogador', {
      fontSize: `${isCompact ? 12 : 14}px`,
      fill: '#00ffff',
      fontStyle: 'bold',
    }).setDepth(9);

    this.add.text(panelX + panelWidth * 0.12, headerY, 'Pontos', {
      fontSize: `${isCompact ? 12 : 14}px`,
      fill: '#00ffff',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(9);

    this.add.text(panelX + panelWidth * 0.32, headerY, 'Lv', {
      fontSize: `${isCompact ? 12 : 14}px`,
      fill: '#00ffff',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(9);

    this.loadRankingRows();
  }

  updateRankingTabs() {
    this.rankingTabs?.forEach(({ key, button, text }) => {
      const isActive = key === this.rankingMode;

      button
        .setFillStyle(isActive ? 0xfff700 : 0x111122, isActive ? 0.22 : 0.8)
        .setStrokeStyle(2, isActive ? 0xfff700 : 0x00ffff);

      text.setColor(isActive ? '#fff700' : '#00ffff');
    });
  }

  setRankingMode(mode) {
    const nextMode = normalizeRankingMode(mode);
    if (this.rankingMode === nextMode) return;

    this.rankingMode = nextMode;
    localStorage.setItem(RANKING_TAB_STORAGE_KEY, nextMode);
    this.updateRankingTabs();
    this.loadRankingRows();
  }

  clearRankingRows() {
    this.rankingRows?.forEach((row) => row?.destroy?.());
    this.rankingRows = [];

    this.rankingStatusText?.destroy?.();
    this.rankingStatusText = null;
  }

  async loadRankingRows() {
    if (!this.rankingPanelInfo) return;

    const { panelX, panelY, panelWidth, panelHeight, isCompact } = this.rankingPanelInfo;
    const mode = normalizeRankingMode(this.rankingMode);
    const loadId = (this.rankingLoadId || 0) + 1;
    this.rankingLoadId = loadId;

    this.clearRankingRows();

    this.rankingStatusText = this.add.text(panelX, panelY, 'Carregando ranking...', {
      fontSize: `${isCompact ? 13 : 16}px`,
      fill: '#cccccc',
      align: 'center',
      wordWrap: { width: panelWidth - 40 },
    })
      .setOrigin(0.5)
      .setDepth(9);

    const rows = await fetchRankings(isCompact ? 5 : 10, mode);

    if (loadId !== this.rankingLoadId) return;

    this.rankingStatusText?.destroy();
    this.rankingStatusText = null;

    if (!rows.length) {
      this.rankingStatusText = this.add.text(panelX, panelY, 'Nenhuma pontuacao registrada ainda.', {
        fontSize: `${isCompact ? 13 : 16}px`,
        fill: '#cccccc',
        align: 'center',
        wordWrap: { width: panelWidth - 40 },
      })
        .setOrigin(0.5)
        .setDepth(9);
      return;
    }

    const startY = panelY - panelHeight / 2 + (isCompact ? 110 : 138);
    const availableRowSpace = Math.max(32, panelHeight - (isCompact ? 124 : 156));
    const rowGap = Math.min(isCompact ? 24 : 32, availableRowSpace / rows.length);

    rows.forEach((row, index) => {
      const y = startY + index * rowGap;
      const name = String(row.nome).slice(0, isCompact ? 12 : 14);
      const fontSize = `${isCompact ? 12 : 14}px`;

      const positionText = this.add.text(panelX - panelWidth * 0.42, y, `${row.position}`, {
        fontSize,
        fill: '#ffffff',
      }).setDepth(9);

      const nameText = this.add.text(panelX - panelWidth * 0.32, y, name, {
        fontSize,
        fill: '#ffffff',
      }).setDepth(9);

      const scoreText = this.add.text(panelX + panelWidth * 0.12, y, `${row.maxPontuacao}`, {
        fontSize,
        fill: '#fff700',
      }).setOrigin(0.5, 0).setDepth(9);

      const levelText = this.add.text(panelX + panelWidth * 0.34, y, `${row.maxLevel}`, {
        fontSize,
        fill: '#00ffff',
      }).setOrigin(0.5, 0).setDepth(9);

      this.rankingRows.push(positionText, nameText, scoreText, levelText);
    });
  }

  resize(gameSize) {
    const { width, height } = gameSize;
    this.bgFar.setSize(width, height);
    this.bgNear.setSize(width, height);
  }

  updateCoinUI() {
    const state = this.coinSystem.getState();
    this.coinText.setText(`Moedas: ${state.coinBalance}`);
    if (this.coinSystem.hasClaimedToday()) {
      this.claimText.setText('Resgatado hoje');
      this.claimButton.disableInteractive?.();
      this.claimButton.setFillStyle(0x222222, 0.9);
    } else {
      this.claimText.setText('Ganhar 150 moedas');
      this.claimButton.setInteractive({ useHandCursor: true });
      this.claimButton.setFillStyle(0x111122, 0.9);
    }
  }

  update(time, delta) {
    const speedFar = 0.03 * delta;
    const speedNear = 0.08 * delta;

    this.bgFar.tilePositionX += speedFar;
    this.bgNear.tilePositionX -= speedNear;
  }
}
