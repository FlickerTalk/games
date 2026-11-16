import { createSession } from './session.js';
import { injectStyle } from './style.js';
import { appOpening } from './opening.js';
import { roomHeight } from './room.js';
import { createSwitches } from './sound-switches.js';

export class RacerElement extends HTMLElement {
  connectedCallback() {
    const page = this.ownerDocument;
    injectStyle(page);
    const canvas = page.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    const goButton = page.createElement('button');
    goButton.type = 'button';
    goButton.className = 'go';
    const switches = createSwitches(page);
    this.replaceChildren(canvas, goButton, switches.sound, switches.music, switches.volume);
    this.session = createSession({
      canvas,
      goButton,
      keyTarget: page.defaultView,
      page,
      store: globalThis.ft?.store,
      app: globalThis.ft,
      options: this.racerOptions ?? {},
      opening: appOpening,
      switches,
    });
    this.watch = new MutationObserver(() => this.fitMode());
    this.watch.observe(page.documentElement, { attributes: true, attributeFilter: ['data-fill'] });
    this.sizes = new ResizeObserver((entries) => this.resized(entries.at(-1)?.contentRect));
    this.sizes.observe(this);
    this.resized(this.getBoundingClientRect());
  }

  disconnectedCallback() {
    this.watch?.disconnect();
    this.sizes?.disconnect();
    this.session?.destroy();
    this.watch = null;
    this.sizes = null;
  }

  fitMode() {
    const filling = this.ownerDocument.documentElement.hasAttribute('data-fill');
    const height = filling ? '' : `${roomHeight({ screenHeight: globalThis.screen?.height, width: this.knownWidth ?? 0 })}px`;
    if (this.style.height !== height) this.style.height = height;
  }

  resized(rect) {
    if (!rect || !this.session) return;
    this.knownWidth = rect.width;
    this.fitMode();
    this.session.resize({ width: rect.width, height: rect.height, dpr: globalThis.devicePixelRatio || 1 });
  }
}
