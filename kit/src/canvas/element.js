import { avatarText } from "../avatars/index.js";
import { createSound, soundControls } from "../sound/index.js";
import { ROOM_CHROME } from "../stage.js";
import { readTokens } from "./theme.js";

const ROOM_LEAST = 300;
const ROOM_MOST = 1100;
const NAME_MOST = 24;
const POINTERS = [["pointerdown", "down"], ["pointermove", "move"], ["pointerup", "up"], ["pointercancel", "cancel"]];

export const roomHeight = (screenHeight) => Math.round(Math.min(ROOM_MOST, Math.max(ROOM_LEAST, (screenHeight || 853) - ROOM_CHROME)));

export const canvasStyle = (tag) => `
${tag} { display: block; position: relative; width: 100%; overflow: hidden; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }
html[data-fill] ${tag} { height: 100%; }
${tag} > canvas { display: block; width: 100%; height: 100%; touch-action: none; }
${tag} > .ftc-a11y { position: absolute; inset: 0; pointer-events: none; }
${tag} > .ftc-a11y > button { position: absolute; margin: 0; padding: 0; border: 0; background: none; opacity: 0; pointer-events: none; }
${tag} > .ftc-a11y > button:focus-visible { opacity: 1; outline: 3px solid currentColor; outline-offset: 2px; }
${tag} > input { position: absolute; left: 50%; top: 40%; transform: translateX(-50%); box-sizing: border-box; width: 220px; height: 48px; font: inherit; font-size: 20px; text-align: center; }
${tag} > input[hidden] { display: none; }
`;

function addStyle(page, tag) {
  if (page.head.querySelector(`style[data-ft-canvas="${tag}"]`)) return;
  const style = page.createElement("style");
  style.dataset.ftCanvas = tag;
  style.textContent = canvasStyle(tag);
  page.head.append(style);
}

class CanvasGameElement extends HTMLElement {
  connectedCallback() {
    if (this.game) return;
    const page = this.ownerDocument;
    addStyle(page, this.localName);
    this.ft ??= globalThis.ft;
    this.canvas = page.createElement("canvas");
    this.canvas.setAttribute("role", "img");
    this.layer = page.createElement("div");
    this.layer.className = "ftc-a11y";
    this.field = page.createElement("input");
    this.field.hidden = true;
    this.field.maxLength = NAME_MOST;
    this.replaceChildren(this.canvas, this.layer, this.field);
    const { options } = this;
    this.sound = createSound(options.sound ?? {}, { ft: this.ft, page });
    const controls = soundControls(this.sound);
    this.game = options.create({ ft: this.ft, sound: this.sound, controls, app: options.version, onAsk: (what, asked) => this.ask(what, asked), onChange: () => this.changed() });
    this.sound.onChange(() => {
      this.game.syncSound?.();
      this.wake();
    });
    this.frame = this.frame.bind(this);
    this.listen();
    this.retheme();
    this.ft.onOpen((opening) => this.opened(opening));
    this.measure();
  }

  listen() {
    const point = (type) => (event) => {
      const area = this.canvas.getBoundingClientRect();
      if (type === "down") {
        this.named();
        this.canvas.setPointerCapture?.(event.pointerId);
      }
      this.game.pointer({ type, x: event.clientX - area.left, y: event.clientY - area.top, id: event.pointerId });
      this.changed();
    };
    for (const [name, type] of POINTERS) this.canvas.addEventListener(name, point(type));
    // After a touch the browser sends mousedown once the finger has lifted, which would take the focus from the name field just opened.
    this.canvas.addEventListener("mousedown", (event) => this.field.hidden || event.preventDefault());
    this.field.addEventListener("keydown", (event) => event.key === "Enter" && this.named());
    this.field.addEventListener("blur", () => this.named());
    this.watch = new MutationObserver(() => {
      this.retheme();
      this.measure();
    });
    this.watch.observe(this.ownerDocument.documentElement, { attributes: true, attributeFilter: ["data-fill", "data-dark", "style", "class"] });
    this.sizes = globalThis.ResizeObserver ? new ResizeObserver(() => this.measure()) : null;
    this.sizes?.observe(this);
    this.shown = () => this.wake();
    this.ownerDocument.addEventListener("visibilitychange", this.shown);
  }

  async opened(opening) {
    await this.game.open(opening);
    this.canvas.setAttribute("aria-label", this.options.canvasLabel?.(this.game.state.lang) ?? "");
    if (this.options.music) this.sound.music(this.options.music);
    this.measure();
  }

  retheme() {
    const root = this.ownerDocument.documentElement;
    const tokens = readTokens(root);
    const dark = root.hasAttribute("data-dark") || (!tokens && Boolean(globalThis.matchMedia?.("(prefers-color-scheme: dark)")?.matches));
    const key = JSON.stringify([tokens, dark]);
    if (key === this.themeKey) return;
    this.themeKey = key;
    this.theme = this.options.theme(tokens, { dark });
    const { ui } = this.theme;
    Object.assign(this.field.style, { color: ui.text, background: ui.surface, border: `${ui.line}px solid ${ui.border}`, borderRadius: `${ui.radius}px` });
    this.layer.style.color = ui.text;
    this.wake();
  }

  measure() {
    const fill = this.ownerDocument.documentElement.hasAttribute("data-fill");
    const height = fill ? "" : `${roomHeight(globalThis.screen?.height)}px`;
    if (this.style.height !== height) this.style.height = height;
    const area = this.getBoundingClientRect();
    const width = Math.round(area.width || globalThis.innerWidth || 384);
    const tall = Math.round(area.height || (fill ? globalThis.innerHeight : roomHeight(globalThis.screen?.height)) || 640);
    const ratio = globalThis.devicePixelRatio || 1;
    this.canvas.width = Math.round(width * ratio);
    this.canvas.height = Math.round(tall * ratio);
    this.ratio = ratio;
    this.game.resize(width, tall, fill);
    this.changed();
  }

  changed() {
    this.labels();
    this.wake();
  }

  wake() {
    if (this.pending || !this.isConnected || this.ownerDocument.hidden) return;
    this.pending = requestAnimationFrame(this.frame);
  }

  frame(now) {
    this.pending = 0;
    if (!this.isConnected) return;
    this.game.frame(now);
    const ctx = this.canvas.getContext?.("2d");
    if (ctx) {
      ctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
      this.options.draw(ctx, this.game, this.theme, now / 1000);
    }
    if (!this.game.resting?.()) this.wake();
  }

  labels() {
    const { button = () => true, label } = this.options;
    const targets = this.game.targets().filter(button);
    const shown = JSON.stringify(targets.map(({ kind, value, x, y, w, h }) => [kind, value, x, y, w, h, this.game.state.lang]));
    if (shown === this.labelled) return;
    this.labelled = shown;
    this.layer.replaceChildren(
      ...targets.map((target) => {
        const element = this.ownerDocument.createElement("button");
        element.type = "button";
        element.setAttribute("aria-label", label(target, this.game));
        Object.assign(element.style, { left: `${target.x}px`, top: `${target.y}px`, width: `${target.w}px`, height: `${target.h}px` });
        element.addEventListener("click", () => {
          this.game.press(target);
          this.changed();
        });
        return element;
      }),
    );
  }

  ask(what, { value } = {}) {
    if (what !== "rename") return;
    this.field.value = value ?? this.game.state.pick?.choice?.name ?? "";
    this.field.setAttribute("aria-label", avatarText(this.game.state.lang, "name"));
    this.field.hidden = false;
    this.field.focus?.();
  }

  named() {
    if (this.field.hidden) return;
    this.field.hidden = true;
    this.game.rename?.(this.field.value);
    this.changed();
  }

  disconnectedCallback() {
    cancelAnimationFrame(this.pending);
    this.pending = 0;
    this.watch?.disconnect();
    this.sizes?.disconnect();
    this.ownerDocument.removeEventListener("visibilitychange", this.shown);
    this.sound?.close();
    this.game?.close?.();
  }
}

export function defineCanvasGame(tag, options) {
  if (customElements.get(tag)) return;
  customElements.define(
    tag,
    class extends CanvasGameElement {
      get options() {
        return options;
      }
    },
  );
}
