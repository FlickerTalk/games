import { cellBox, fractionOf } from "../../../kit/src/tabletop/grid.js";
import { drawBoard, layoutFor } from "./paint.js";
import { openCells, pick } from "./picking.js";
import { PLACE_MS, missFrame, placeFrame, planMove, winFrame } from "./moves.js";

const NOMINAL = 352;
const SETTLED = Object.freeze({ ribbon: 1, cheer: 0, tilt: 0, done: true });

const signature = (state) => state.cells.map((one) => (one === null ? "." : one)).join("");
const lineOf = (context) => context.result?.result?.line ?? null;

class Scene {
  constructor(context, { wake = () => {}, now = () => globalThis.performance?.now?.() ?? Date.now(), still = () => false } = {}) {
    Object.assign(this, { wake, now, still, ctx: context, key: signature(context.state) });
    Object.assign(this, { placing: null, winning: null, missing: null });
  }

  update(next) {
    const key = signature(next.state);
    const moving = !this.still();
    if (key !== this.key) {
      const plan = planMove(this.ctx.state, next.state, next.last);
      Object.assign(this, { key, missing: null, placing: plan && moving ? { ...plan, start: this.now() } : null });
    }
    if (!lineOf(next)) this.winning = null;
    else if (!lineOf(this.ctx) && moving) this.winning = { start: this.placing ? this.placing.start + PLACE_MS : this.now() };
    this.ctx = next;
  }

  label() {
    return this.ctx.t("board");
  }

  buttons({ size = NOMINAL } = {}) {
    const { t, state, canPlay, last, pending } = this.ctx;
    const { grid } = layoutFor(size);
    const names = [t("markX"), t("markO")];
    const free = openCells(state, canPlay);
    const line = lineOf(this.ctx) ?? [];
    return state.cells.map((side, cell) => {
      const marks = [[free.includes(cell), "can"], [cell === last && side !== null, "last"], [pending && cell === last, "pending"], [line.includes(cell), "win"]];
      const mark = marks.filter(([on]) => on).map(([, name]) => name).join(" ");
      return {
        key: cell,
        box: fractionOf(cellBox(grid, cell), size),
        label: `${t("cell", { row: Math.floor(cell / 3) + 1, col: (cell % 3) + 1 })}: ${side === null ? t("empty") : names[side]}`,
        disabled: !canPlay,
        data: { cell, mark: mark || null },
      };
    });
  }

  press(cell) {
    const picked = pick(this.ctx.state, this.ctx.canPlay, cell);
    if (picked?.move !== undefined) {
      this.ctx.play(picked.move);
      return;
    }
    if (picked?.miss === undefined) return;
    this.missing = { cell, start: this.now() };
    this.ctx.sound?.play("error-soft");
    this.wake();
  }

  placingAt(now) {
    if (!this.placing) return null;
    const frame = placeFrame(now - this.placing.start);
    return frame.done ? null : { cell: this.placing.cell, side: this.placing.side, grow: frame.grow, burst: frame.burst };
  }

  missAt(now) {
    if (!this.missing) return null;
    const frame = missFrame(now - this.missing.start);
    return frame.done ? null : { cell: this.missing.cell, shake: frame.shake, ring: frame.ring };
  }

  winAt(now, still) {
    const line = lineOf(this.ctx);
    if (!line) return null;
    const frame = still || !this.winning ? SETTLED : winFrame(now - this.winning.start);
    return { line, winner: this.ctx.result.result.winner, ribbon: frame.ribbon, cheer: frame.cheer, tilt: frame.tilt, done: frame.done };
  }

  view(now, { still = false, size = NOMINAL } = {}) {
    const { state, canPlay, mySide, last, pending } = this.ctx;
    return {
      size,
      cells: state.cells,
      side: mySide ?? 0,
      open: openCells(state, canPlay),
      last: Number.isInteger(last) ? last : null,
      pending: Boolean(pending),
      placing: still ? null : this.placingAt(now),
      miss: still ? null : this.missAt(now),
      win: this.winAt(now, still),
    };
  }

  draw(ctx, { size, theme, now, still }) {
    const view = this.view(now, { still, size });
    drawBoard(ctx, theme, view);
    if (!view.placing) this.placing = null;
    if (!view.miss) this.missing = null;
    if (!view.win || view.win.done) this.winning = null;
    return view.placing || view.miss || (view.win && !view.win.done) ? 0 : null;
  }
}

export const createScene = (context, options) => new Scene(context, options);
