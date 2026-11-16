import { cellBox, cellCentre, fractionOf } from "../../../kit/src/tabletop/grid.js";
import { easeInOut, progressOf } from "../../../kit/src/tabletop/motion.js";
import { drawBoard, layoutFor } from "./paint.js";
import { choices, dropOn, dropSquares, tap } from "./picking.js";
import { cuesBetween, moveFrame, planMove } from "./moves.js";
import { SIZE, count, isDark, squaresOf } from "./rules.js";

const RETURN_MS = 180;
const PARK_MS = 1000;
const PULSE_MS = 66;
const NOMINAL = 352;
const CUES = { capture: "tick", crown: "success" };

const signature = (state) => `${state.cells.map((one) => (one === null ? "." : one)).join("")}${state.next}`;
const isHop = (from, to) => Math.abs(Math.floor(to / SIZE) - Math.floor(from / SIZE)) === 2;

class Scene {
  constructor(context, { wake = () => {}, now = () => globalThis.performance?.now?.() ?? Date.now(), still = () => false } = {}) {
    Object.assign(this, { wake, now, still, ctx: context, key: signature(context.state), path: [], offer: null });
    Object.assign(this, { motion: null, held: null, returning: null, parked: null, dropped: null });
  }

  get flipped() {
    return this.ctx.mySide === 0;
  }

  choices() {
    this.offer ??= choices(this.ctx.state, this.ctx.mySide, this.ctx.canPlay, this.path);
    return this.offer;
  }

  update(next) {
    const key = signature(next.state);
    if (key !== this.key) {
      const plan = planMove(this.ctx.state, next.state, next.last);
      this.motion = plan && !this.still() ? { plan, start: this.now(), travel: next.last !== this.dropped, heard: -1 } : null;
      Object.assign(this, { key, path: [], dropped: null, parked: null, returning: null });
    }
    if (!next.canPlay) this.path = [];
    this.ctx = next;
    this.offer = null;
  }

  label() {
    const [dark, light] = count(this.ctx.state.cells);
    return `${this.ctx.t("board")}: ${this.ctx.t("count", { dark, light })}`;
  }

  buttons({ size = NOMINAL } = {}) {
    const { t, state, canPlay, pending } = this.ctx;
    const { from, to, forced } = this.choices();
    const { grid } = layoutFor(size);
    const last = squaresOf(this.ctx.last) ?? [];
    const names = [t("dark"), t("light"), t("darkKing"), t("lightKing")];
    const found = [];
    for (let shown = 0; shown < SIZE * SIZE; shown += 1) {
      const cell = this.flipped ? SIZE * SIZE - 1 - shown : shown;
      if (!isDark(cell)) continue;
      const piece = state.cells[cell];
      const marks = [[this.path.includes(cell), "from"], [from.includes(cell), "can"], [to.includes(cell), "to"], [last.includes(cell), "last"], [pending && last.at(-1) === cell, "pending"], [forced.includes(cell), "forced"]];
      const mark = marks.filter(([on]) => on).map(([, name]) => name).join(" ");
      found.push({
        key: cell,
        box: fractionOf(cellBox(grid, cell, { flipped: this.flipped }), size),
        label: `${t("square", { row: Math.floor(cell / SIZE) + 1, col: (cell % SIZE) + 1 })}: ${piece === null ? t("empty") : names[piece]}`,
        disabled: !(canPlay && (from.includes(cell) || to.includes(cell) || this.path.includes(cell))),
        data: { cell, drag: this.canDrag(cell), mark: mark || null },
      });
    }
    return found;
  }

  press(cell) {
    const before = this.path.length;
    const { path, move } = tap(this.choices().legal, this.path, cell);
    this.path = path;
    this.offer = null;
    if (move) {
      this.ctx.play(move);
      return;
    }
    if (path.length > before) this.ctx.sound?.play("tap");
    this.wake();
  }

  prefixOf(cell) {
    return this.path[0] === cell ? this.path : [cell];
  }

  canDrag(cell) {
    return Boolean(this.ctx.canPlay && this.ctx.mySide !== null && (this.choices().from.includes(cell) || this.path[0] === cell));
  }

  dropTargets(cell) {
    return [...dropSquares(this.choices().legal, this.prefixOf(cell))];
  }

  dragAt(cell, point) {
    if (point) Object.assign(this, { held: { cell, point }, returning: null });
    else if (this.held) Object.assign(this, { returning: { ...this.held, start: this.now() }, held: null });
    this.wake();
  }

  drop(cell, target) {
    const { path, move } = dropOn(this.choices().legal, this.prefixOf(cell), target);
    this.offer = null;
    if (!move) {
      this.path = path;
      return;
    }
    Object.assign(this, { parked: this.returning && { ...this.returning, until: this.now() + PARK_MS }, returning: null, path: [], dropped: move });
    this.ctx.play(move);
  }

  floatingAt(now, size) {
    const { grid, radius } = layoutFor(size);
    const piece = (cell) => this.ctx.state.cells[cell];
    const held = this.held ?? (this.parked && now < this.parked.until ? this.parked : null);
    if (held) return { cell: held.cell, piece: piece(held.cell), x: held.point.x, y: held.point.y, lift: radius * 0.45 };
    if (!this.returning) return null;
    const progress = progressOf(this.returning.start, RETURN_MS, now);
    if (progress >= 1) return null;
    const home = cellCentre(grid, this.returning.cell, { flipped: this.flipped });
    const eased = easeInOut(progress);
    const { x, y } = this.returning.point;
    return { cell: this.returning.cell, piece: piece(this.returning.cell), x: x + (home.x - x) * eased, y: y + (home.y - y) * eased, lift: radius * 0.45 * (1 - eased) };
  }

  movingAt(now) {
    if (!this.motion) return null;
    const { plan, start, travel } = this.motion;
    const frame = moveFrame(plan, now - start, { travel });
    return frame.done ? null : { plan, frame };
  }

  view(now, { still = false, size = NOMINAL } = {}) {
    const { from, to, forced } = this.choices();
    const motion = still ? null : this.movingAt(now);
    const floating = this.floatingAt(now, size);
    const last = squaresOf(this.ctx.last);
    const landing = motion?.plan.path.at(-1);
    const end = this.path.at(-1);
    return {
      size,
      flipped: this.flipped,
      cells: this.ctx.state.cells,
      time: still ? 0 : now / 1000,
      last: last ? [last[0], last.at(-1)] : null,
      selected: this.path,
      targets: to.map((cell) => ({ cell, capture: isHop(end, cell) })),
      forced: from.length ? forced : [],
      pending: this.ctx.pending && last ? last.at(-1) : null,
      hidden: [landing, floating?.cell].filter((cell) => cell !== undefined),
      moving: motion && { piece: motion.plan.piece, path: motion.plan.path, hops: motion.plan.hops, progress: motion.frame.progress, crown: motion.frame.crown },
      standing: motion?.frame.standing ?? [],
      bursts: motion?.frame.bursts ?? [],
      sparkle: motion && motion.frame.crown > 0 && motion.frame.crown < 1 ? { cell: landing, progress: motion.frame.crown } : null,
      floating,
    };
  }

  hear(now) {
    if (!this.motion) return;
    const elapsed = now - this.motion.start;
    for (const cue of cuesBetween(this.motion.plan, this.motion.heard, elapsed, { travel: this.motion.travel })) this.ctx.sound?.play(CUES[cue]);
    this.motion.heard = Math.max(this.motion.heard, elapsed);
  }

  draw(ctx, { size, theme, now, still }) {
    const view = this.view(now, { still, size });
    if (!still) this.hear(now);
    drawBoard(ctx, theme, view);
    if (view.moving || view.floating) return 0;
    this.motion = null;
    if (still) return null;
    return view.selected.length || view.forced.length ? PULSE_MS : null;
  }
}

export const createScene = (context, options) => new Scene(context, options);
