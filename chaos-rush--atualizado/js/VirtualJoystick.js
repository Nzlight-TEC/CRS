export default class VirtualJoystick {
  constructor(options = {}) {
    this.vx = 0;
    this.vy = 0;
    this.active = false;
    this.dashPressed = false;
    this.skillPressed = false;
    this.pausePressed = false;

    this.onSkill = options.onSkill || null;
    this.onPause = options.onPause || null;

    this._radius = 46;
    this._pointerId = null;
    this._zoneRect = null;
    this._listeners = [];

    this._build();
    this._bindEvents();
  }

  _build() {
    const css = `
      #mobile-controls {
        position: fixed;
        inset: 0;
        z-index: 9999;
        pointer-events: none;
        user-select: none;
        -webkit-user-select: none;
        touch-action: none;
      }

      #mobile-controls[hidden] {
        display: none !important;
      }

      .mc-button,
      #mc-stick-zone {
        pointer-events: auto;
        touch-action: none;
        -webkit-tap-highlight-color: transparent;
      }

      #mc-stick-zone {
        position: absolute;
        left: max(22px, env(safe-area-inset-left));
        bottom: max(22px, env(safe-area-inset-bottom));
        width: 150px;
        height: 150px;
      }

      #mc-stick-base {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background:
          radial-gradient(circle at 42% 34%, rgba(255,255,255,0.12), rgba(255,255,255,0.03) 58%, rgba(0,0,0,0.54)),
          linear-gradient(135deg, rgba(0,255,255,0.18), rgba(255,247,0,0.08));
        border: 2px solid rgba(0,255,255,0.32);
        box-shadow:
          0 0 22px rgba(0,255,255,0.16),
          0 8px 26px rgba(0,0,0,0.52),
          inset 0 1px 0 rgba(255,255,255,0.18);
        backdrop-filter: blur(5px);
      }

      #mc-stick-base::before,
      #mc-stick-base::after {
        content: '';
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        border-radius: 999px;
        background: rgba(255,255,255,0.08);
      }

      #mc-stick-base::before {
        width: 2px;
        height: 68%;
      }

      #mc-stick-base::after {
        width: 68%;
        height: 2px;
      }

      #mc-stick {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        background: radial-gradient(circle at 38% 30%, rgba(255,255,255,0.38), rgba(0,255,255,0.24) 42%, rgba(0,76,132,0.76));
        border: 2px solid rgba(157,246,255,0.58);
        box-shadow:
          0 0 18px rgba(0,255,255,0.34),
          0 4px 12px rgba(0,0,0,0.45),
          inset 0 1px 0 rgba(255,255,255,0.25);
        will-change: transform;
      }

      #mc-stick.pressed {
        box-shadow:
          0 0 28px rgba(255,247,0,0.36),
          0 4px 12px rgba(0,0,0,0.45),
          inset 0 1px 0 rgba(255,255,255,0.34);
      }

      #mc-action-cluster {
        position: absolute;
        right: max(22px, env(safe-area-inset-right));
        bottom: max(28px, env(safe-area-inset-bottom));
        width: 164px;
        height: 154px;
      }

      .mc-button {
        position: absolute;
        border: 2px solid rgba(0,255,255,0.48);
        border-radius: 50%;
        background:
          radial-gradient(circle at 38% 30%, rgba(255,255,255,0.30), rgba(0,255,255,0.16) 43%, rgba(8,10,16,0.78)),
          linear-gradient(135deg, rgba(0,255,255,0.16), rgba(255,247,0,0.12));
        color: #ffffff;
        font-family: 'Tektur', 'Arial Black', sans-serif;
        font-weight: 900;
        text-shadow: 0 2px 4px rgba(0,0,0,0.78);
        box-shadow:
          0 0 18px rgba(0,255,255,0.22),
          0 5px 16px rgba(0,0,0,0.48),
          inset 0 1px 0 rgba(255,255,255,0.18);
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        transition: transform 70ms ease, box-shadow 70ms ease, border-color 70ms ease;
      }

      .mc-button.pressed {
        transform: scale(0.9);
        border-color: rgba(255,247,0,0.75);
        box-shadow:
          0 0 28px rgba(255,247,0,0.38),
          0 2px 8px rgba(0,0,0,0.48),
          inset 0 1px 0 rgba(255,255,255,0.24);
      }

      #mc-skill-btn {
        right: 70px;
        bottom: 78px;
        width: 76px;
        height: 76px;
        font-size: 12px;
      }

      #mc-dash-btn {
        right: 0;
        bottom: 0;
        width: 82px;
        height: 82px;
        font-size: 12px;
      }

      #mc-pause-btn {
        right: max(16px, env(safe-area-inset-right));
        top: max(14px, env(safe-area-inset-top));
        width: 52px;
        height: 52px;
        font-size: 20px;
      }

      @media (hover: hover) and (pointer: fine) {
        #mobile-controls {
          display: none !important;
        }
      }

      @media (max-width: 760px) {
        #mc-stick-zone {
          width: 128px;
          height: 128px;
        }

        #mc-stick {
          width: 52px;
          height: 52px;
        }

        #mc-action-cluster {
          width: 144px;
          height: 136px;
        }

        #mc-skill-btn {
          right: 62px;
          bottom: 70px;
          width: 68px;
          height: 68px;
          font-size: 11px;
        }

        #mc-dash-btn {
          width: 74px;
          height: 74px;
          font-size: 11px;
        }
      }
    `;

    this._style = document.createElement('style');
    this._style.textContent = css;
    document.head.appendChild(this._style);

    this._root = document.createElement('div');
    this._root.id = 'mobile-controls';
    this._root.innerHTML = `
      <div id="mc-stick-zone" aria-label="Movimento">
        <div id="mc-stick-base"></div>
        <div id="mc-stick"></div>
      </div>
      <div id="mc-action-cluster">
        <button id="mc-skill-btn" class="mc-button" type="button" aria-label="Habilidade">SKILL</button>
        <button id="mc-dash-btn" class="mc-button" type="button" aria-label="Dash">DASH</button>
      </div>
      <button id="mc-pause-btn" class="mc-button" type="button" aria-label="Pausar">II</button>
    `;
    document.body.appendChild(this._root);

    this._zone = this._root.querySelector('#mc-stick-zone');
    this._stick = this._root.querySelector('#mc-stick');
    this._dash = this._root.querySelector('#mc-dash-btn');
    this._skill = this._root.querySelector('#mc-skill-btn');
    this._pause = this._root.querySelector('#mc-pause-btn');
  }

  _on(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    this._listeners.push({ target, type, handler, options });
  }

  _bindEvents() {
    this._on(this._zone, 'pointerdown', (event) => {
      event.preventDefault();
      if (this._pointerId !== null) return;

      this._pointerId = event.pointerId;
      this._zone.setPointerCapture?.(event.pointerId);
      this._zoneRect = this._zone.getBoundingClientRect();
      this._stick.classList.add('pressed');
      this._updateStick(event.clientX, event.clientY);
    });

    this._on(this._zone, 'pointermove', (event) => {
      if (event.pointerId !== this._pointerId) return;

      event.preventDefault();
      this._updateStick(event.clientX, event.clientY);
    });

    const releaseStick = (event) => {
      if (event.pointerId !== this._pointerId) return;

      this._zone.releasePointerCapture?.(event.pointerId);
      this._pointerId = null;
      this._resetStick();
    };

    this._on(this._zone, 'pointerup', releaseStick);
    this._on(this._zone, 'pointercancel', releaseStick);
    this._on(this._zone, 'lostpointercapture', () => {
      this._pointerId = null;
      this._resetStick();
    });

    this._bindButton(this._dash, () => {
      this.dashPressed = true;
    });

    this._bindButton(this._skill, () => {
      this.skillPressed = true;
      this.onSkill?.();
    });

    this._bindButton(this._pause, () => {
      this.pausePressed = true;
      this.onPause?.();
    });
  }

  _bindButton(button, onPress) {
    this._on(button, 'pointerdown', (event) => {
      event.preventDefault();
      button.classList.add('pressed');
      onPress();
    });

    const release = (event) => {
      event.preventDefault();
      button.classList.remove('pressed');
    };

    this._on(button, 'pointerup', release);
    this._on(button, 'pointercancel', release);
    this._on(button, 'pointerleave', () => button.classList.remove('pressed'));
  }

  _updateStick(clientX, clientY) {
    if (!this._zoneRect) return;

    const centerX = this._zoneRect.left + this._zoneRect.width / 2;
    const centerY = this._zoneRect.top + this._zoneRect.height / 2;

    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > this._radius) {
      dx = (dx / distance) * this._radius;
      dy = (dy / distance) * this._radius;
    }

    this._stick.style.transform =
      `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

    const norm = Math.min(distance / this._radius, 1);
    const angle = Math.atan2(dy, dx);
    this.vx = norm > 0.12 ? Math.cos(angle) : 0;
    this.vy = norm > 0.12 ? Math.sin(angle) : 0;
    this.active = norm > 0.12;
  }

  _resetStick() {
    this._stick.style.transform = 'translate(-50%, -50%)';
    this._stick.classList.remove('pressed');
    this.vx = 0;
    this.vy = 0;
    this.active = false;
  }

  consumeDash() {
    this.dashPressed = false;
  }

  consumeSkill() {
    this.skillPressed = false;
  }

  consumePause() {
    this.pausePressed = false;
  }

  setVisible(visible) {
    if (!this._root) return;
    this._root.hidden = !visible;
    if (!visible) this._resetStick();
  }

  destroy() {
    this._listeners.forEach(({ target, type, handler, options }) => {
      target.removeEventListener(type, handler, options);
    });
    this._listeners = [];
    this._root?.remove();
    this._style?.remove();
    this._root = null;
    this._style = null;
  }
}
