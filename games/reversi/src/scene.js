import { cellBox, fractionOf } from "../../../kit/src/tabletop/grid.js";
import { drawBoard, layoutFor } from "./paint.js";
import { cuesBetween, durationOf, moveFrame, planMove, turnedBy } from "./moves.js";
import { SIZE, count, moves } from "./rules.js";

const PULSE_MS = 66;
const NOMINAL = 352;
const WAITING = 2;
const CUES = { flip: "tick", pass: "whoosh" };

const signature = (state) => `${state.cells.map((one) => (one === null ? "." : one)).join("")}${state.next}`;
const endOf = (show) => show.until ?? show.start + durationOf(show.plan);

class Scene {
  constructor(context, { now = () => globalThis.performance?.now?.() ?? Date.now() } = {}) {
    Object.assign(this, { now, ctx: context, key: signature(context.state), shows: [], turned: [], legal: null });
  }

  update(next) {
    const key = signature(next.state);
    if (key !== this.key) {
      const plan = planMove(this.ctx.state, next.state, next.last);
      if (plan) this.queue(plan, next.state.cells);
      else this.shows = [];
      Object.assign(this, { key, turned: plan ? plan.turned.map(({ cell }) => cell) : [] });
    }
    this.ctx = next;
    this.legal = null;
  }

  queue(plan, cells) {
    const now = this.now();
    this.shows = this.shows.filter((show) => endOf(show) > now).slice(-(WAITING - 1));
    const before = this.shows.at(-1);
    if (before) before.until = Math.min(endOf(before), Math.max(now, before.start + turnedBy(before.plan)));
    const start = Math.max(now, ...this.shows.map(endOf));
    this.shows.push({ plan, cells, start, heard: -1 });
  }

  targets() {
    const { state, mySide, canPlay } = this.ctx;
    this.legal ??= canPlay && mySide !== null && mySide !== undefined ? moves(state.cells, mySide) : [];
    return this.legal;
  }

  label() {
    const [dark, light] = count(this.ctx.state.cells);
    return `${this.ctx.t("board")}: ${this.ctx.t("count", { dark, light })}`;
  }

  buttons({ size = NOMINAL } = {}) {
    const { t, state, canPlay, pending, last } = this.ctx;
    const legal = this.targets();
    const { grid } = layoutFor(size);
    const names = [t("dark"), t("light")];
    return state.cells.map((side, cell) => {
      const marks = [[legal.includes(cell), "can"], [cell === last && side !== null, "last"], [pending && cell === last, "pending"], [this.turned.includes(cell), "turned"]];
      const mark = marks.filter(([on]) => on).map(([, name]) => name).join(" ");
      return {
        key: cell,
        box: fractionOf(cellBox(grid, cell), size),
        label: `${t("cell", { row: Math.floor(cell / SIZE) + 1, col: (cell % SIZE) + 1 })}: ${side === null ? t("empty") : names[side]}`,
        disabled: !(canPlay && legal.includes(cell)),
        data: { cell, mark: mark || null },
      };
    });
  }

  press(cell) {
    if (this.targets().includes(cell)) this.ctx.play(cell);
  }

  showing(now) {
    const show = this.shows.find((one) => now < endOf(one));
    return show ? { show, frame: moveFrame(show.plan, now - show.start) } : null;
  }

  view(now, { still = false, size = NOMINAL } = {}) {
    const { state, pending, last } = this.ctx;
    const active = this.showing(now);
    const moving = active && !still ? active : null;
    const cells = moving ? moving.show.cells : state.cells;
    const placed = moving && moving.frame.pop < 1 ? { cell: moving.show.plan.cell, pop: moving.frame.pop } : null;
    const turning = moving && !moving.frame.pass;
    const pass = active?.show.plan.passed ? (still ? { side: 1 - active.show.plan.side, progress: 0.5 } : moving.frame.pass) : null;
    const shownLast = moving ? moving.show.plan.cell : last;
    return {
      size,
      cells,
      time: still ? 0 : now / 1000,
      targets: turning ? [] : this.targets(),
      last: placed || shownLast === null || shownLast === undefined ? null : shownLast,
      pending: pending && last !== null && cells[last] !== null ? last : null,
      placed,
      flips: moving ? moving.frame.flips : {},
      sparks: moving ? moving.frame.sparks : [],
      pass,
    };
  }

  hear(now) {
    for (const show of this.shows) {
      const elapsed = Math.min(now, endOf(show) - 1) - show.start;
      if (elapsed < 0) continue;
      for (const cue of cuesBetween(show.plan, show.heard, elapsed)) this.ctx.sound?.play(CUES[cue]);
      show.heard = Math.max(show.heard, elapsed);
    }
  }

  draw(ctx, { size, theme, now, still }) {
    const view = this.view(now, { still, size });
    if (!still) this.hear(now);
    drawBoard(ctx, theme, view);
    this.shows = this.shows.filter((show) => now < endOf(show));
    if (this.shows.length) return still ? Math.max(1, endOf(this.shows.at(-1)) - now) : 0;
    if (still) return null;
    return view.targets.length ? PULSE_MS : null;
  }
}

export const createScene = (context, options) => new Scene(context, options);
