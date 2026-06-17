export default class PauseMenu extends Phaser.Scene {
    constructor() {
        super({ key: 'PauseMenu' });
    }

    create() {
        const { width, height } = this.scale;

        // Fundo escurecido - Cobrindo a tela toda
        const fundoCor = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
        fundoCor.setScrollFactor(0);

        // Container centralizado
        this.pauseContainer = this.add.container(width / 2, height / 2);
        this.pauseContainer.setScrollFactor(0);

        // Painel Principal (Corrigido o Hexadecimal)
        const painel = this.add.graphics();
        painel.fillStyle(0x101f21, 0.9); // Cor sólida com alpha no segundo parâmetro
        painel.fillRoundedRect(-200, -150, 400, 350, 20);
        painel.lineStyle(4, 0x3498db);
        painel.strokeRoundedRect(-200, -150, 400, 350, 20);

        const title = this.add.text(0, -100, 'JOGO PAUSADO', {
            fontSize: '40px',
            fontFamily: 'Arial Black',
            fill: '#ecf0f1'
        }).setOrigin(0.5);

        // Adiciona ao container ANTES de criar os botões
        this.pauseContainer.add([painel, title]);

        // Cria os botões e já os coloca no container
        this.createButtons();

        // Garante que o container apareça ACIMA do fundo
        this.pauseContainer.setDepth(10); 

        // Efeito de entrada
        this.pauseContainer.setScale(0);
        this.tweens.add({
            targets: this.pauseContainer,
            scale: 1,
            duration: 300,
            ease: 'Back.easeOut'
        });

        this.input.keyboard.on('keydown-ESC', () => this.resumeGame());
    }

    createButtons() {
        const buttons = [
            { text: 'Voltar', callback: () => this.resumeGame() },
            { text: 'Reiniciar', callback: () => this.restartGame() },
            { text: 'Menu', callback: () => this.goToMenu() }
        ];

        buttons.forEach((buttonData, index) => {
            const botao = this.add.text(0, 20 + (index * 60), buttonData.text, {
                fontSize: '24px',
                fill: '#ecf0f1',
                fontFamily: 'Arial'
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            botao.on('pointerover', () => botao.setStyle({ fill: '#3498db' }));
            botao.on('pointerout', () => botao.setStyle({ fill: '#ecf0f1' }));
            botao.on('pointerdown', () => buttonData.callback());

            this.pauseContainer.add(botao);
        });
    }

    resumeGame() {
    const mainScene = this.scene.get('MainScene');
    if (mainScene) {
        mainScene.resumeGame();  // ← Isso chama o método COMPLETO da MainScene
    }
    this.scene.stop();
}

    async restartGame() {
        const mainScene = this.scene.get('MainScene');
        await mainScene?.saveCurrentRanking?.();
        const selectedClassKey = mainScene?.selectedClassKey;
        const selectedGameMode = mainScene?.selectedGameMode || mainScene?.gameMode;

        this.scene.stop('PauseMenu');
        mainScene.scene.restart({ selectedClassKey, selectedGameMode });
    }

    async goToMenu() {
        const mainScene = this.scene.get('MainScene');
        await mainScene?.saveCurrentRanking?.();

        this.scene.stop('PauseMenu');
        this.scene.stop('MainScene');
        this.scene.start('MenuScene');
    }
}
