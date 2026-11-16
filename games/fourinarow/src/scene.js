import { fractionOf } from "../../../kit/src/tabletop/grid.js";
import { WIN_MS, cuesBetween, dropFrame, planDrop, totalMs, winGlow } from "./moves.js";
import { columnBox, drawBoard, layoutFor } from "./paint.js";
import { openColumns, pick } from "./picking.js";
import { COLUMNS, ROWS, result } from "./rules.js";

const PULSE_MS = 66;
const NOMINAL = 352;
const CUES = { land: "tick" };

const signature = (state) => state.cells.map((one) => (one === null ? "." : one)).join("");
const lineOf = (state) => result(state)?.line ?? null;
const cellsOf = (column) => Array.from({ length: ROWS }, (_, row) => row * COLUMNS + column);

function topOf(cells, column) {
  return cellsOf(column).find((cell) => cells[cell] !== null) ?? null;
}

class Scene {
  constructor(context, { wake = () => {}, now = () => globalThis.performance?.now?.() ?? Date.now(), still = () => false } = {}) {
    Object.assign(this, { wake, now, still, ctx: context, key: signature(context.state), motion: null });
    this.won = lineOf(context.state) ? { at: this.now() } : null;
  }

  update(next) {
    const key = signature(next.state);
    if (key !== this.key) {
      const plan = planDrop(this.ctx.state, next.state, next.last);
      const start = this.now();
      this.motion = plan && !this.still() ? { plan, start, heard: -1 } : null;
      this.won = lineOf(next.state) ? { at: start + (this.motion ? totalMs(plan) : 0) } : null;
      this.key = key;
    }
    this.ctx = next;
  }

  label() {
    return this.ctx.t("board");
  }

  lastCell() {
    return Number.isInteger(this.ctx.last) ? topOf(this.ctx.state.cells, this.ctx.last) : null;
  }

  columnLabel(column, { names, number, list }) {
    const { t, state } = this.ctx;
    const discs = cellsOf(column)
      .reverse()
      .filter((cell) => state.cells[cell] !== null)
      .map((cell) => names[state.cells[cell]]);
    return `${t("column", { n: number.format(column + 1) })}: ${discs.length ? list.format(discs) : t("empty")}`;
  }

  buttons({ size = NOMINAL } = {}) {
    const { t, lang, state, canPlay, pending, last } = this.ctx;
    const open = openColumns(state.cells, canPlay);
    const layout = layoutFor(size);
    const words = { names: [t("markX"), t("markO")], number: new Intl.NumberFormat(lang), list: new Intl.ListFormat(lang, { type: "unit", style: "short" }) };
    const winning = new Set(lineOf(state) ?? []);
    return Array.from({ length: COLUMNS }, (_, column) => {
      const marks = [[open.includes(column), "can"], [last === column, "last"], [pending && last === column, "pending"], [cellsOf(column).some((cell) => winning.has(cell)), "win"]];
      const mark = marks.filter(([on]) => on).map(([, name]) => name).join(" ");
      return {
        key: column,
        box: fractionOf(columnBox(layout, column), size),
        label: this.columnLabel(column, words),
        disabled: !open.includes(column),
        data: { col: column, mark: mark || null },
      };
    });
  }

  press(column) {
    const move = pick(this.ctx.state.cells, this.ctx.canPlay, column);
    if (move !== null) this.ctx.play(move);
  }

  motionAt(now) {
    if (!this.motion) return null;
    const frame = dropFrame(this.motion.plan, now - this.motion.start);
    return frame.done ? null : { plan: this.motion.plan, frame };
  }

  view(now, { still = false, size = NOMINAL } = {}) {
    const motion = still ? null : this.motionAt(now);
    const { plan, frame } = motion ?? {};
    const falling = motion && !frame.resting ? { side: plan.side, column: plan.column, row: frame.row } : null;
    return {
      size,
      cells: this.ctx.state.cells,
      time: still ? 0 : now / 1000,
      open: openColumns(this.ctx.state.cells, this.ctx.canPlay),
      chosen: motion && plan.side === this.ctx.mySide ? plan.column : null,
      last: this.lastCell(),
      pending: Boolean(this.ctx.pending),
      line: motion ? null : lineOf(this.ctx.state),
      glow: still || !this.won ? 0 : winGlow(now - this.won.at),
      hidden: falling ? [plan.cell] : [],
      falling,
      burst: motion && frame.burst !== null ? { cell: plan.cell, side: plan.side, progress: frame.burst } : null,
    };
  }

  hear(now) {
    if (!this.motion) return;
    const elapsed = now - this.motion.start;
    for (const cue of cuesBetween(this.motion.plan, this.motion.heard, elapsed)) this.ctx.sound?.play(CUES[cue]);
    this.motion.heard = Math.max(this.motion.heard, elapsed);
  }

  draw(ctx, { size, theme, now, still }) {
    const view = this.view(now, { still, size });
    if (!still) this.hear(now);
    drawBoard(ctx, theme, view);
    if (view.falling || view.burst) return 0;
    this.motion = null;
    return !still && this.won && now - this.won.at < WIN_MS ? PULSE_MS : null;
  }
}

export const createScene = (context, options) => new Scene(context, options);
