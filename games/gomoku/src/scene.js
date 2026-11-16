import { cellBox, fractionOf } from "../../../kit/src/tabletop/grid.js";
import { confirmBox, drawBoard, layoutFor } from "./paint.js";
import { confirm, tap } from "./picking.js";
import { moveFrame, planMove } from "./moves.js";
import { SIZE } from "./rules.js";

const PULSE_MS = 66;
const MISS_MS = 650;
const NOMINAL = 352;
const GHOST = "ghost";

const signature = (state) => `${state.cells.map((one) => (one === null ? "." : one)).join("")}${state.count}`;
const named = (cell) => ({ row: Math.floor(cell / SIZE) + 1, col: (cell % SIZE) + 1 });

class Scene {
  constructor(context, { wake = () => {}, now = () => globalThis.performance?.now?.() ?? Date.now(), still = () => false } = {}) {
    Object.assign(this, { wake, now, still, ctx: context, key: signature(context.state), chosen: null, miss: null, motion: null });
  }

  get open() {
    const { canPlay, mySide } = this.ctx;
    return Boolean(canPlay) && mySide !== null && mySide !== undefined;
  }

  update(next) {
    const key = signature(next.state);
    if (key !== this.key) {
      const plan = planMove(this.ctx.state, next.state, next.last);
      this.motion = plan && !this.still() ? { plan, start: this.now() } : null;
      Object.assign(this, { key, chosen: null, miss: null });
    }
    if (!next.canPlay) this.chosen = null;
    this.ctx = next;
  }

  label() {
    return this.ctx.t("board");
  }

  buttons({ size = NOMINAL } = {}) {
    const { t, state, pending, last } = this.ctx;
    const layout = layoutFor(size);
    const names = [t("black"), t("white")];
    const won = new Set(state.line ?? []);
    const found = state.cells.map((side, cell) => {
      const marks = [[cell === this.chosen, "chosen"], [cell === last && side !== null, "last"], [pending && cell === last, "pending"], [won.has(cell), "won"]];
      const mark = marks.filter(([on]) => on).map(([, name]) => name).join(" ");
      return {
        key: cell,
        box: fractionOf(cellBox(layout.grid, cell), size),
        label: `${t("cell", named(cell))}: ${side === null ? t("empty") : names[side]}`,
        disabled: !this.open,
        data: { cell, mark: mark || null },
      };
    });
    if (this.open && this.chosen !== null) {
      found.push({ key: GHOST, box: fractionOf(confirmBox(layout, this.chosen), size), label: t("place", named(this.chosen)), data: { ghost: this.chosen } });
    }
    return found;
  }

  press(key) {
    const { cells } = this.ctx.state;
    const { chosen, move, miss } = key === GHOST ? confirm(cells, this.chosen) : tap(cells, this.chosen, key);
    const moved = chosen !== null && chosen !== this.chosen;
    this.chosen = chosen;
    if (move !== null) {
      this.ctx.play(move);
      return;
    }
    if (miss) {
      this.miss = { cell: key, start: this.now() };
      this.ctx.sound?.play("error-soft");
    }
    if (moved) this.ctx.sound?.play("tap");
    this.wake();
  }

  movingAt(now) {
    if (!this.motion) return null;
    const frame = moveFrame(this.motion.plan, now - this.motion.start);
    return frame.done ? null : { plan: this.motion.plan, frame };
  }

  missAt(now) {
    if (!this.miss || now - this.miss.start >= MISS_MS) return null;
    return { cell: this.miss.cell, progress: (now - this.miss.start) / MISS_MS };
  }

  view(now, { still = false, size = NOMINAL } = {}) {
    const { state, pending, last, mySide } = this.ctx;
    const moving = still ? null : this.movingAt(now);
    const frame = moving?.frame;
    const cell = moving?.plan.cell;
    return {
      size,
      cells: state.cells,
      time: still ? 0 : now / 1000,
      last: Number.isInteger(last) ? last : null,
      pending: pending && Number.isInteger(last) ? last : null,
      chosen: this.open && this.chosen !== null ? { cell: this.chosen, side: mySide } : null,
      entering: frame && frame.enter < 1 ? { cell, progress: frame.enter } : null,
      pop: frame && frame.pop !== null ? { cell, progress: frame.pop } : null,
      won: state.line ? { cells: state.line, progress: frame?.line ?? 1, cheer: frame?.cheer ?? 0 } : null,
      miss: still ? null : this.missAt(now),
    };
  }

  draw(ctx, { size, theme, now, still }) {
    const view = this.view(now, { still, size });
    drawBoard(ctx, theme, view);
    if (!still && (this.movingAt(now) || view.miss)) return 0;
    Object.assign(this, { motion: null, miss: null });
    if (still) return null;
    return view.chosen ? PULSE_MS : null;
  }
}

export const createScene = (context, options) => new Scene(context, options);
