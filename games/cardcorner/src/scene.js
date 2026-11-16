import { createSprites } from "../../../kit/src/cards/sprites.js";
import { chooser } from "./chooser.js";
import { fishView } from "./fish-view.js";
import { drawPendingClock } from "./marks.js";
import { pairsView } from "./pairs-view.js";
import { rummyView } from "./rummy-view.js";
import { drawFelt, drawFlight, flightDone, frameOf } from "./table.js";
import { TABLE_OF } from "./theme.js";
import { warView } from "./war-view.js";

const NOMINAL = 343;
const VIEWS = { pairs: pairsView, war: warView, rummy: rummyView, fish: fishView };
const EMPTY = { table: "choose", layout: (size) => ({ frame: frameOf(size), inner: frameOf(size).inner }), buttons: () => [], press: () => {}, label: ({ t }) => t("name"), paint: () => {}, flights: () => [], cues: () => [] };

const viewOf = (state) => (state.table ? VIEWS[state.game] : chooser);

class Scene {
  constructor(context, { wake = () => {}, now = () => globalThis.performance?.now?.() ?? Date.now(), sprites = createSprites() } = {}) {
    Object.assign(this, { wake, now, sprites, ctx: context, key: JSON.stringify(context.state), local: { selected: [], sizing: false, order: "suit" }, motion: null, theme: null, size: NOMINAL });
  }

  get me() {
    return this.ctx.mySide ?? null;
  }

  seat(size = this.size) {
    const { ctx, local, wake } = this;
    const { state } = ctx;
    const view = this.me === null && state.table ? EMPTY : viewOf(state);
    return { view, ctx, state, me: this.me, local, size, t: ctx.t, canPlay: Boolean(ctx.canPlay) && this.me !== null, wake, layout: view.layout(size, state, local) };
  }

  update(next) {
    const key = JSON.stringify(next.state);
    if (key !== this.key) {
      const before = this.ctx.state;
      const view = viewOf(next.state);
      const follows = before.table && next.state.table && before.game === next.state.game && typeof next.last === "string" && (next.mySide ?? null) !== null;
      const flights = follows ? view.flights(before, next.state, next.last, next.mySide, this.size, this.local) : [];
      this.motion = flights.length ? { start: this.now(), flights } : null;
      for (const { cue, at } of follows ? view.cues(before, next.state, next.last) : []) next.sound?.play(`cards-${cue}`, { delay: at / 1000 });
      if (!before.table && next.state.table) next.sound?.play("cards-deal", { delay: 0 });
      Object.assign(this.local, { selected: [], sizing: false });
      this.key = key;
    }
    if (!next.canPlay) this.local.selected = [];
    this.ctx = next;
  }

  label() {
    const seat = this.seat();
    return seat.view.label(seat);
  }

  buttons({ size = NOMINAL } = {}) {
    this.size = size;
    const seat = this.seat(size);
    return seat.view.buttons(seat);
  }

  press(key) {
    const seat = this.seat();
    seat.view.press(key, seat);
  }

  draw(ctx, { size, theme, now, still }) {
    if (theme !== this.theme) {
      this.sprites.clear();
      this.theme = theme;
    }
    this.size = size;
    const seat = this.seat(size);
    const elapsed = this.motion ? now - this.motion.start : 0;
    const flying = this.motion && !still ? this.motion.flights.filter((flight) => !flightDone(flight, elapsed)) : [];
    const ratio = ctx.getTransform?.().a ?? 1;
    drawFelt(ctx, theme, seat.layout.frame, theme.tables[TABLE_OF[seat.view.table]]);
    seat.view.paint(ctx, theme, { ...seat, hidden: new Set(flying.flatMap((flight) => flight.hide ?? [])), ratio, sprites: this.sprites });
    for (const flight of flying) drawFlight(ctx, theme, this.sprites, flight, elapsed, ratio);
    if (this.ctx.pending) {
      const { inner } = seat.layout;
      const side = Math.max(28, inner.w * 0.1);
      drawPendingClock(ctx, theme, { x: inner.x + inner.w - side - inner.w * 0.02, y: inner.y + inner.w - side * 1.2, w: side, h: side });
    }
    if (!flying.length) this.motion = null;
    return flying.length ? 0 : null;
  }
}

export const createScene = (context, options) => new Scene(context, options);
