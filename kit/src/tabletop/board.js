import TABLETOP_CSS from "./tabletop.css";
import { DRAG_STYLE, makeDraggable } from "../drag.js";
import { readTokens } from "../canvas/theme.js";
import { syncButtons } from "./buttons.js";

export const TABLETOP_STYLE = `${TABLETOP_CSS}\n${DRAG_STYLE}`;

// buttons are laid out in shares of the board, so a size is needed before the host has one
const NOMINAL = 320;

const media = (query) => Boolean(globalThis.matchMedia?.(query)?.matches);

const DEFAULTS = {
  frame: (callback) => globalThis.requestAnimationFrame?.(callback) ?? null,
  cancel: (id) => globalThis.cancelAnimationFrame?.(id),
  context: (canvas) => canvas.getContext?.("2d") ?? null,
  ratio: () => globalThis.devicePixelRatio || 1,
  still: () => media("(prefers-reduced-motion: reduce)"),
};

class Surface {
  constructor(host, context, spec, options) {
    this.host = host;
    this.spec = spec;
    this.options = { ...DEFAULTS, ...options };
    this.page = host.ownerDocument;
    this.size = 0;
    this.pending = null;
    this.timer = null;
    this.gone = false;
    this.build();
    this.scene = spec.scene(context, { wake: () => this.wake() });
    this.listen();
    this.retheme();
    this.measure();
    this.refresh();
  }

  build() {
    this.canvas = this.page.createElement("canvas");
    this.canvas.className = "ftt-canvas";
    this.canvas.setAttribute("aria-hidden", "true");
    this.layer = this.page.createElement("div");
    this.layer.className = "ftt-layer";
    this.layer.setAttribute("role", "group");
    const ghosts = this.page.createElement("span");
    ghosts.className = "ftt-ghosts";
    ghosts.setAttribute("aria-hidden", "true");
    this.layer.append(ghosts);
    this.host.replaceChildren(this.canvas, this.layer);
  }

  listen() {
    this.onClick = (event) => {
      const button = event.target.closest?.("button[data-key]");
      if (!button || button.disabled || !this.layer.contains(button)) return;
      this.scene.press(this.keyOf(button));
      this.refresh();
    };
    this.layer.addEventListener("click", this.onClick);
    this.drag = this.scene.canDrag ? this.draggable() : null;
    this.onMove = (event) => {
      const held = this.layer.querySelector(":scope > button[data-dragging]");
      if (held) this.scene.dragAt?.(this.keyOf(held), this.pointOf(event));
      this.wake();
    };
    this.layer.addEventListener("pointermove", this.onMove);
    this.watch = new MutationObserver(() => this.retheme());
    this.watch.observe(this.page.documentElement, { attributes: true, attributeFilter: ["style", "class", "data-dark"] });
    this.sizes = globalThis.ResizeObserver ? new ResizeObserver(() => this.measure()) : null;
    this.sizes?.observe(this.host);
    this.shown = () => this.wake();
    this.page.addEventListener("visibilitychange", this.shown);
  }

  draggable() {
    const button = (key) => this.layer.querySelector(`:scope > button[data-key="${String(key)}"]`);
    const letGo = (el) => {
      this.scene.dragAt?.(this.keyOf(el), null);
      this.wake();
    };
    return makeDraggable(this.layer, {
      canDrag: (el) => this.scene.canDrag(this.keyOf(el)),
      ghost: (el) => el,
      targets: (el) => (this.scene.dropTargets?.(this.keyOf(el)) ?? []).map(button),
      onDrop: (el, target) => {
        letGo(el);
        this.scene.drop(this.keyOf(el), this.keyOf(target));
        this.refresh();
      },
      onCancel: (el) => {
        letGo(el);
        this.refresh();
      },
    });
  }

  keyOf(button) {
    const key = button.dataset.key;
    return /^-?\d+$/.test(key) ? Number(key) : key;
  }

  pointOf(event) {
    const area = this.host.getBoundingClientRect();
    return { x: event.clientX - area.left, y: event.clientY - area.top };
  }

  retheme() {
    const root = this.page.documentElement;
    const tokens = readTokens(root);
    const dark = root.hasAttribute("data-dark") || (!tokens && media("(prefers-color-scheme: dark)"));
    const key = JSON.stringify([tokens, dark]);
    if (key === this.themeKey) return;
    this.themeKey = key;
    this.theme = this.spec.theme(tokens, { dark });
    this.wake();
  }

  measure() {
    const size = Math.round(this.host.getBoundingClientRect().width || this.host.clientWidth || 0);
    const ratio = this.options.ratio();
    if (size === this.size && ratio === this.ratio) return;
    this.size = size;
    this.ratio = ratio;
    this.canvas.width = Math.round(size * ratio);
    this.canvas.height = Math.round(size * ratio);
    if (this.scene) this.refresh();
  }

  refresh() {
    syncButtons(this.layer, this.scene.buttons({ size: this.size || NOMINAL }));
    const label = this.scene.label();
    if (this.layer.getAttribute("aria-label") !== label) this.layer.setAttribute("aria-label", label);
    this.wake();
  }

  wake(delay = 0) {
    if (this.gone || this.pending !== null) return;
    if (delay > 0) {
      if (this.timer === null) this.timer = setTimeout(() => this.wake(), delay);
      return;
    }
    clearTimeout(this.timer);
    this.timer = null;
    this.pending = this.options.frame((now) => this.paint(now));
  }

  paint(now) {
    this.pending = null;
    if (this.gone || this.page.hidden) return;
    const ctx = this.options.context(this.canvas);
    if (!ctx || !this.size) return;
    ctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    ctx.clearRect(0, 0, this.size, this.size);
    const next = this.scene.draw(ctx, { size: this.size, theme: this.theme, now, still: this.options.still() });
    if (next !== null && next !== undefined) this.wake(next);
  }

  update(context) {
    if (this.drag?.active && !context.canPlay) this.drag.cancel();
    this.scene.update(context);
    this.measure();
    this.refresh();
  }

  destroy() {
    this.gone = true;
    if (this.pending !== null) this.options.cancel(this.pending);
    clearTimeout(this.timer);
    this.drag?.destroy();
    this.watch.disconnect();
    this.sizes?.disconnect();
    this.page.removeEventListener("visibilitychange", this.shown);
    this.layer.removeEventListener("click", this.onClick);
    this.layer.removeEventListener("pointermove", this.onMove);
    this.scene.destroy?.();
    this.host.replaceChildren();
  }
}

export function canvasBoard(spec, options = {}) {
  return {
    mount(host, context) {
      const surface = new Surface(host, context, spec, options);
      return { update: (next) => surface.update(next), destroy: () => surface.destroy() };
    },
  };
}
