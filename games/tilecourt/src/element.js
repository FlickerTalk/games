import { createSound, soundControls } from "../../../kit/src/sound/index.js";
import { ROOM_CHROME } from "../../../kit/src/stage.js";
import STYLE from "./board.css";
import { drawFrame } from "./frame.js";
import { createGame } from "./game.js";
import { labelFor, say } from "./labels.js";
import { THEME } from "./theme.js";

const ROOM_LEAST = 300;
const ROOM_MOST = 1100;
const NAME_MOST = 24;

export const roomHeight = (screenHeight) => Math.round(Math.min(ROOM_MOST, Math.max(ROOM_LEAST, (screenHeight || 853) - ROOM_CHROME)));

function addStyle(page) {
  if (page.head.querySelector("style[data-ft-tilecourt]")) return;
  const style = page.createElement("style");
  style.dataset.ftTilecourt = "";
  style.textContent = STYLE;
  page.head.append(style);
}

class TileCourtElement extends HTMLElement {
  connectedCallback() {
    if (this.game) return;
    const page = this.ownerDocument;
    addStyle(page);
    this.ft ??= globalThis.ft;
    this.canvas = page.createElement("canvas");
    this.canvas.setAttribute("role", "img");
    this.layer = page.createElement("div");
    this.layer.className = "ftc-a11y";
    this.field = page.createElement("input");
    this.field.hidden = true;
    this.field.maxLength = NAME_MOST;
    this.replaceChildren(this.canvas, this.layer, this.field);
    this.sound = createSound({}, { ft: this.ft, page });
    const controls = soundControls(this.sound);
    this.game = createGame({ ft: this.ft, sound: this.sound, controls, app: this.app, onAsk: (what) => this.ask(what), onChange: () => this.labels() });
    this.sound.onChange(() => this.game.syncSound());
    this.listen();
    this.ft.onOpen((opening) => this.opened(opening));
    this.measure();
    this.frame = this.frame.bind(this);
    this.pending = requestAnimationFrame(this.frame);
  }

  listen() {
    const point = (type) => (event) => {
      const box = this.canvas.getBoundingClientRect();
      if (type === "down") this.canvas.setPointerCapture?.(event.pointerId);
      this.game.pointer({ type, x: event.clientX - box.left, y: event.clientY - box.top, id: event.pointerId });
      this.labels();
    };
    for (const [name, type] of [["pointerdown", "down"], ["pointermove", "move"], ["pointerup", "up"], ["pointercancel", "cancel"]]) this.canvas.addEventListener(name, point(type));
    this.field.addEventListener("keydown", (event) => event.key === "Enter" && this.named());
    this.field.addEventListener("blur", () => this.named());
    this.watch = new MutationObserver(() => this.measure());
    this.watch.observe(this.ownerDocument.documentElement, { attributes: true, attributeFilter: ["data-fill"] });
    this.sizes = globalThis.ResizeObserver ? new ResizeObserver(() => this.measure()) : null;
    this.sizes?.observe(this);
  }

  async opened(opening) {
    await this.game.open(opening);
    this.canvas.setAttribute("aria-label", say(this.game.state.lang, "canvas"));
    this.sound.music("playful");
    this.measure();
  }

  measure() {
    const fill = this.ownerDocument.documentElement.hasAttribute("data-fill");
    const height = fill ? "" : `${roomHeight(globalThis.screen?.height)}px`;
    if (this.style.height !== height) this.style.height = height;
    const box = this.getBoundingClientRect();
    const width = Math.round(box.width || globalThis.innerWidth || 384);
    const tall = Math.round(box.height || (fill ? globalThis.innerHeight : roomHeight(globalThis.screen?.height)) || 640);
    const ratio = globalThis.devicePixelRatio || 1;
    this.canvas.width = Math.round(width * ratio);
    this.canvas.height = Math.round(tall * ratio);
    this.ratio = ratio;
    this.game.resize(width, tall, fill);
    this.labels();
  }

  frame(now) {
    this.pending = requestAnimationFrame(this.frame);
    this.game.frame(now);
    const ctx = this.canvas.getContext?.("2d");
    if (!ctx) return;
    ctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    drawFrame(ctx, this.game, THEME, now / 1000);
  }

  labels() {
    const targets = this.game.targets();
    const shown = JSON.stringify(targets.map(({ kind, value, x, y, w, h }) => [kind, value, x, y, w, h, this.game.state.lang]));
    if (shown === this.shown) return;
    this.shown = shown;
    const buttons = targets.filter((target) => target.kind !== "slot").map((target) => {
      const button = this.ownerDocument.createElement("button");
      button.type = "button";
      button.setAttribute("aria-label", labelFor(target, this.game.state));
      Object.assign(button.style, { left: `${target.x}px`, top: `${target.y}px`, width: `${target.w}px`, height: `${target.h}px` });
      button.addEventListener("click", () => {
        this.game.press(target);
        this.labels();
      });
      return button;
    });
    this.layer.replaceChildren(...buttons);
  }

  ask(what) {
    if (what !== "rename") return;
    this.field.value = this.game.state.pick?.choice.name ?? "";
    this.field.setAttribute("aria-label", say(this.game.state.lang, "avatar"));
    this.field.hidden = false;
    this.field.focus?.();
  }

  named() {
    if (this.field.hidden) return;
    this.field.hidden = true;
    this.game.rename(this.field.value);
  }

  disconnectedCallback() {
    cancelAnimationFrame(this.pending);
    this.watch?.disconnect();
    this.sizes?.disconnect();
    this.sound?.close();
    this.game?.close();
  }
}

export function defineTileCourt(tag, version = "1.0.0") {
  if (customElements.get(tag)) return;
  customElements.define(
    tag,
    class extends TileCourtElement {
      get app() {
        return version;
      }
    },
  );
}
