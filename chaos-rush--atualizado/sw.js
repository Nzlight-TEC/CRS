const CACHE_VERSION = 'chaos-rush-pwa-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/phaser.min.js',
  './js/main.js',
  './js/pwa.js',
  './js/VirtualJoystick.js',
  './js/supabaseClient.js',
  './js/scene/LoginScene.js',
  './js/scene/RegisterScene.js',
  './js/scene/MenuScene.js',
  './js/scene/BattlePassScene.js',
  './js/scene/ShopScene.js',
  './js/scene/MainScene.js',
  './js/scene/PauseMenu.js',
  './js/entities/Player/player.js',
  './js/entities/Player/PlayerClass.js',
  './js/entities/Player/StatsPlayer.js',
  './js/entities/Player/DamagePlayer.js',
  './js/entities/Enemy/enemy.js',
  './js/entities/Enemy/EnemyBullet.js',
  './js/entities/XPOrb.js',
  './js/systems/RankingService.js',
  './js/systems/WeaponSystem.js',
  './js/systems/UpgradeSystem.js',
  './js/systems/ShopSystem.js',
  './js/systems/BattlePassSystem.js',
  './js/systems/ClassSystems.js',
  './js/systems/CoinSystem.js',
  './js/systems/PassiveSystem/PassiveSystem.js',
  './js/systems/PassiveSystem/PassiveAlquimista.js',
  './js/systems/PassiveSystem/PassiveCoveiro.js',
  './js/systems/PassiveSystem/PassiveBastiao.js',
  './js/Director/SpawnDirector.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/img/menu-init-1.png',
  './assets/img/mapa atualizado pt4.png',
  './assets/img/Logotipo CHAOS RUSH.png',
  './assets/music/menu-music1.mp3',
  './assets/Sprites/Alquimista12.png',
  './assets/Sprites/coveiro-recortado.png',
  './assets/Sprites/karg.png',
  './assets/Sprites/foice-girando-recortada.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    if (url.hostname === 'cdn.jsdelivr.net') {
      event.respondWith(networkFirst(request));
    }
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(new Request(new URL('./index.html', self.location.href), { cache: 'reload' })));
    return;
  }

  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.html') || url.pathname.endsWith('.css')) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});
