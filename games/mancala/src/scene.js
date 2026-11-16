import { fractionOf } from "../../../kit/src/tabletop/grid.js";
import { cuesBetween, lastMover, planBetween, plansAfter, sowFrame, sowMs } from "./moves.js";
import { drawBoard, layoutFor, pitBox } from "./paint.js";
import { openPits, pick } from "./picking.js";
import { PITS, STORE, pitOf, result } from "./rules.js";

const NOMINAL = 352;
const SHOWN = [13, 12, 11, 10, 9, 8, 7, 0, 1, 2, 3, 4, 5, 6];
// cues of a sowing that ended longer ago than this were missed while the page was hidden
const LATE_MS = 250;
const CUES = { seed: ["tick", { gain: 0.45 }], store: ["pick"], extra: ["success"], capture: ["collect"] };

const signature = (state) => `${state.pits.join(",")}|${state.next}`;
const movesOf = (context) => (Array.isArray(context.view?.round?.moves) ? context.view.round.moves : null);
const sideOf = (pit) => (pit <= STORE[0] ? 0 : 1);
const endOf = (item) => item.start + sowMs(item.plan);
const follows = (before, after) => after.length > before.length && before.every((move, at) => move === after[at]);

class Scene {
  constructor(context, { wake = () => {}, now = () => globalThis.performance?.now?.() ?? Date.now(), still = () => false } = {}) {
    Object.assign(this, { wake, now, still, queue: [] });
    this.take(context, null);
  }

  take(context, plans) {
    const moves = movesOf(context);
    this.by = moves ? lastMover(moves) : (plans?.at(-1)?.side ?? this.by ?? null);
    Object.assign(this, { ctx: context, key: signature(context.state), moves });
    this.number = new Intl.NumberFormat(context.lang || "en");
  }

  get me() {
    return this.ctx.mySide ?? 0;
  }

  get flipped() {
    return this.ctx.mySide === 1;
  }

  plansTo(next) {
    const moves = movesOf(next);
    if (!moves || !this.moves) {
      const plan = planBetween(this.ctx.state, next.state, next.last);
      return plan ? [plan] : null;
    }
    if (!follows(this.moves, moves)) return null;
    const plans = plansAfter(this.ctx.state, moves.slice(this.moves.length));
    const end = plans?.at(-1);
    return end && signature({ pits: end.after, next: end.next }) === signature(next.state) ? plans : null;
  }

  update(next) {
    let plans = null;
    if (signature(next.state) !== this.key) {
      plans = this.still() ? null : this.plansTo(next);
      if (plans) this.enqueue(plans);
      else this.queue = [];
    }
    this.take(next, plans);
  }

  enqueue(plans) {
    const now = this.now();
    for (const plan of plans) {
      const tail = this.queue.at(-1);
      this.queue.push({ plan, start: Math.max(now, tail ? endOf(tail) : now), heard: -1 });
    }
  }

  lastPit() {
    const { last } = this.ctx;
    if (!Number.isInteger(last)) return null;
    return pitOf(this.by ?? 1 - this.me, last);
  }

  label() {
    const { t, state } = this.ctx;
    return `${t("board")}: ${t("count", { first: state.pits[STORE[0]], second: state.pits[STORE[1]] })}`;
  }

  buttonFor(pit, { layout, size, open, last }) {
    const { t, state, pending } = this.ctx;
    const side = sideOf(pit);
    const mine = side === this.me;
    const seeds = t("seeds", { n: this.number.format(state.pits[pit]) });
    const box = fractionOf(pitBox(layout, pit, this.flipped), size);
    if (pit === STORE[side]) return { key: pit, box, label: `${t(mine ? "yourStore" : "theirStore")}: ${seeds}`, disabled: true, data: { store: side } };
    const n = pit - pitOf(side, 0);
    const can = mine && open.includes(n);
    const marks = [[can, "can"], [pit === last, "last"], [pending && pit === last, "pending"]];
    const mark = marks.filter(([on]) => on).map(([, name]) => name).join(" ");
    const label = `${t(mine ? "yourPit" : "theirPit", { n: this.number.format(n + 1) })}: ${seeds}`;
    return { key: pit, box, label, disabled: !can, data: { pit, move: mine ? n : null, mark: mark || null } };
  }

  buttons({ size = NOMINAL } = {}) {
    const shared = { layout: layoutFor(size), size, open: openPits(this.ctx.state, this.ctx.mySide, this.ctx.canPlay), last: this.lastPit() };
    return SHOWN.map((shown) => this.buttonFor(this.flipped ? (shown + PITS + 1) % SHOWN.length : shown, shared));
  }

  press(pit) {
    const { state, mySide, canPlay } = this.ctx;
    if (mySide !== 0 && mySide !== 1) return;
    const move = pick(state, mySide, canPlay, pit - pitOf(mySide, 0));
    if (move !== null) this.ctx.play(move);
  }

  motionAt(now) {
    return this.queue.find((item) => now < endOf(item)) ?? null;
  }

  view(now, { still = false, size = NOMINAL } = {}) {
    const { state, mySide, canPlay, pending } = this.ctx;
    const motion = still ? null : this.motionAt(now);
    const frame = motion && sowFrame(motion.plan, now - motion.start);
    const pits = frame ? frame.pits : state.pits;
    const side = motion?.plan.side;
    return {
      size,
      flipped: this.flipped,
      pits,
      counts: pits.map((seeds) => this.number.format(seeds)),
      open: motion ? [] : openPits(state, mySide, canPlay).map((n) => pitOf(mySide, n)),
      active: motion ? side : result(state) ? null : state.next,
      last: motion ? null : this.lastPit(),
      pending: !motion && Boolean(pending),
      hop: frame?.hop ?? null,
      capture: frame && frame.capture !== null ? { ...motion.plan.capture, side, progress: frame.capture } : null,
      sparkle: frame && frame.sparkle !== null ? { store: STORE[side], side, progress: frame.sparkle } : null,
    };
  }

  hear(now) {
    for (const item of this.queue) {
      if (item.start > now) break;
      const total = sowMs(item.plan);
      const elapsed = Math.min(now - item.start, total);
      if (now - item.start - total < LATE_MS) for (const cue of cuesBetween(item.plan, item.heard, elapsed)) this.ctx.sound?.play(...CUES[cue]);
      item.heard = Math.max(item.heard, elapsed);
    }
  }

  draw(ctx, { size, theme, now, still }) {
    const view = this.view(now, { still, size });
    if (!still) this.hear(now);
    drawBoard(ctx, theme, view);
    this.queue = still ? [] : this.queue.filter((item) => now < endOf(item));
    return this.queue.length ? 0 : null;
  }
}

export const createScene = (context, options) => new Scene(context, options);
