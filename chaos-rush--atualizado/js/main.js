// TEAM CR2 { MATHEUS, CAIO, ENZO, EDUARDO, PEDRO } - SECUNDARIO

const MODULE_VERSION = `modo-infinito-${Date.now()}`;
const withVersion = (path) => `${path}?v=${MODULE_VERSION}`;

(async () => {
  const [
    { default: LoginScene },
    { default: RegisterScene },
    { default: MenuScene },
    { default: BattlePassScene },
    { default: ShopScene },
    { default: MainScene },
    { default: PauseMenu }
  ] = await Promise.all([
    import(withVersion('./scene/LoginScene.js')),
    import(withVersion('./scene/RegisterScene.js')),
    import(withVersion('./scene/MenuScene.js')),
    import(withVersion('./scene/BattlePassScene.js')),
    import(withVersion('./scene/ShopScene.js')),
    import(withVersion('./scene/MainScene.js')),
    import(withVersion('./scene/PauseMenu.js'))
  ]);

  const config = {
    type: Phaser.AUTO,

    dom: {
      createContainer: true
    },

    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: 'game-container'
    },

    render: {
      pixelArt: true
    },

    physics: {
      default: 'arcade',
      arcade: {
        debug: false
      }
    },

    scene: [LoginScene, RegisterScene, MenuScene, BattlePassScene, ShopScene, MainScene, PauseMenu]
  };

  window.game?.destroy?.(true);
  window.game = new Phaser.Game(config);
})().catch((error) => {
  console.error('Falha ao iniciar o Chaos Rush:', error);
});
