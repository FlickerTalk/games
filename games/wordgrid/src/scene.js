import { cellBox, fractionOf } from "../../../kit/src/tabletop/grid.js";
import { layoutFor } from "./layout.js";
import { planWord, shakeAt, wordFrame } from "./moves.js";
import { drawBoard } from "./paint.js";
import { nextCells, tap, wordOf } from "./picking.js";
import { CELLS, MIN_LETTERS, SIZE, pathOf, refusal } from "./rules.js";

const NOMINAL = 343;
const REASONS = { unknown: "notAWord", used: "alreadySaid", grid: "notOnGrid" };

const signature = (state) => [state.phase, state.grid?.join("") ?? "", state.said[0].join(","), state.said[1].join(","), state.next, state.passes].join("|");

class Scene {
  constructor(context, { wake = () => {}, changed = () => {}, now = () => globalThis.performance?.now?.() ?? Date.now(), still = () => false } = {}) {
    Object.assign(this, { wake, changed, now, still, ctx: context, key: signature(context.state), path: [], sent: null, motion: null, shaking: null });
  }

  get phase() {
    return this.ctx.state.phase;
  }

  open() {
    const { canPlay, mySide } = this.ctx;
    return Boolean(canPlay && mySide !== null && mySide !== undefined && this.phase === "play");
  }

  update(next) {
    const key = signature(next.state);
    if (key !== this.key) {
      const plan = planWord(this.ctx.state, next.state);
      const mine = plan?.side === next.mySide && plan?.word === this.sent;
      this.motion = plan && !this.still() ? { plan, start: this.now(), travel: !mine } : null;
      Object.assign(this, { key, path: [], sent: null, shaking: null });
    }
    if (!next.canPlay) this.path = [];
    this.ctx = next;
  }

  lastWord() {
    const said = /^w([a-zñ]+)$/.exec(this.ctx.last ?? "");
    return said && this.ctx.state.grid ? pathOf(this.ctx.state.grid, said[1]) ?? [] : [];
  }

  pendingCell() {
    return this.ctx.pending ? this.lastWord().at(-1) ?? null : null;
  }

  label() {
    return this.ctx.t("grid");
  }

  markOf(cell, can, last, pending) {
    const marks = [[this.path.includes(cell), "path"], [can.includes(cell), "can"], [last.includes(cell), "last"], [pending === cell, "pending"]];
    return marks.filter(([on]) => on).map(([, name]) => name).join(" ") || null;
  }

  buttons({ size = NOMINAL } = {}) {
    const { state, t } = this.ctx;
    if (!state.grid) return [];
    const { grid } = layoutFor(size, this.phase);
    const can = nextCells(this.path, this.open());
    const [last, pending] = [this.lastWord(), this.pendingCell()];
    return Array.from({ length: CELLS }, (_, cell) => ({
      key: cell,
      box: fractionOf(cellBox(grid, cell), size),
      label: t("tile", { letter: state.grid[cell].toUpperCase(), row: Math.floor(cell / SIZE) + 1, col: (cell % SIZE) + 1 }),
      disabled: !(this.path.includes(cell) || can.includes(cell)),
      data: { cell, mark: this.markOf(cell, can, last, pending) },
    }));
  }

  press(cell) {
    const before = this.path.length;
    this.path = tap(this.path, cell);
    Object.assign(this, { shaking: null, motion: null });
    if (this.path.length > before) this.ctx.sound?.play("tap");
    this.touched();
  }

  touched() {
    this.changed();
    this.wake();
  }

  word() {
    return this.ctx.state.grid ? wordOf(this.ctx.state.grid, this.path) : "";
  }

  canUndo() {
    return this.open() && this.path.length > 0;
  }

  canSay() {
    return this.open() && this.path.length >= MIN_LETTERS;
  }

  canPass() {
    return this.open();
  }

  undo() {
    if (!this.canUndo()) return;
    this.path = this.path.slice(0, -1);
    this.shaking = null;
    this.touched();
  }

  say() {
    if (!this.canSay()) return;
    const word = this.word();
    const why = refusal(this.ctx.state, word);
    if (why) {
      this.ctx.notify?.(this.ctx.t(REASONS[why] ?? "notAWord"));
      this.ctx.sound?.play("error-soft");
      this.shaking = { cells: [...this.path], start: this.now() };
      this.touched();
      return;
    }
    Object.assign(this, { sent: word, path: [], shaking: null });
    this.changed();
    this.ctx.play(`w${word}`);
  }

  pass() {
    if (!this.canPass()) return;
    this.path = [];
    this.changed();
    this.ctx.play("x");
  }

  motionAt(now) {
    if (!this.motion) return null;
    const { plan, start, travel } = this.motion;
    const frame = wordFrame(plan, now - start, { travel });
    return frame.done ? null : { plan, frame };
  }

  traceAt(motion) {
    if (motion) return { side: motion.plan.side, path: motion.frame.traced };
    return this.path.length ? { side: this.ctx.mySide, path: this.path } : null;
  }

  view(now, { still = false, size = NOMINAL } = {}) {
    const motion = still ? null : this.motionAt(now);
    const shake = still || !this.shaking ? null : shakeAt(now - this.shaking.start);
    const open = this.open();
    return {
      size,
      phase: this.phase,
      grid: this.ctx.state.grid,
      trace: this.traceAt(motion),
      can: this.path.length ? nextCells(this.path, open) : [],
      last: motion ? [] : this.lastWord(),
      pending: this.pendingCell(),
      hops: motion ? motion.frame.hops.filter((hop) => hop.progress > 0 && hop.progress < 1) : [],
      shake: shake === null ? null : { cells: this.shaking.cells, progress: shake },
      burst: motion?.frame.burst ? { ...motion.frame.burst, side: motion.plan.side } : null,
      moving: Boolean(motion),
    };
  }

  draw(ctx, { size, theme, now, still }) {
    const view = this.view(now, { still, size });
    drawBoard(ctx, theme, view);
    if (view.moving || view.shake) return 0;
    Object.assign(this, { motion: null, shaking: null });
    return null;
  }
}

export const createScene = (context, options) => new Scene(context, options);
