(function () {
  const INSTALL_BUTTON_ID = 'pwa-install-button';
  let deferredPrompt = null;

  function isStandalone() {
    return window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
  }

  function ensureInstallButton() {
    if (isStandalone() || document.getElementById(INSTALL_BUTTON_ID)) return;

    const button = document.createElement('button');
    button.id = INSTALL_BUTTON_ID;
    button.type = 'button';
    button.textContent = 'Instalar';
    button.setAttribute('aria-label', 'Instalar Chaos Rush');
    button.hidden = true;
    document.body.appendChild(button);

    button.addEventListener('click', async () => {
      if (!deferredPrompt) return;

      button.hidden = true;
      deferredPrompt.prompt();

      try {
        await deferredPrompt.userChoice;
      } finally {
        deferredPrompt = null;
      }
    });
  }

  function ensureRotateHint() {
    if (document.getElementById('pwa-rotate-hint')) return;

    const hint = document.createElement('div');
    hint.id = 'pwa-rotate-hint';
    hint.innerHTML = `
      <strong>Gire o celular</strong>
      <span>Chaos Rush foi feito para jogar na horizontal.</span>
    `;
    document.body.appendChild(hint);
  }

  function showInstallButton() {
    ensureInstallButton();
    const button = document.getElementById(INSTALL_BUTTON_ID);
    if (button && deferredPrompt) button.hidden = false;
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('./sw.js');
        registration.update?.();
      } catch (error) {
        console.warn('PWA nao registrado:', error);
      }
    });
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    showInstallButton();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    const button = document.getElementById(INSTALL_BUTTON_ID);
    if (button) button.hidden = true;
  });

  ensureInstallButton();
  ensureRotateHint();
})();
