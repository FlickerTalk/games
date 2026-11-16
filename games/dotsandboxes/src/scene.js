import { fractionOf } from "../../../kit/src/tabletop/grid.js";
import { drawBoard, layoutFor, touchBox } from "./paint.js";
import { cuesBetween, drawers, extraTurn, moveFrame, planMove } from "./moves.js";
import { BOXES, DOTS, H, count } from "./rules.js";

const NOMINAL = 352;
const CUES = { claim: "collect" };

const signature = (state) => `${state.lines.map((drawn) => (drawn ? 1 : 0)).join("")}${state.boxes.map((owner) => owner ?? ".").join("")}${state.next}`;

const ORDER = Array.from({ length: DOTS }, (_, row) => [
  ...Array.from({ length: BOXES }, (_, col) => row * BOXES + col),
  ...(row < BOXES ? Array.from({ length: DOTS }, (_, col) => H + row * DOTS + col) : []),
]).flat();

function placeOf(line) {
  const flat = line < H;
  const index = flat ? line : line - H;
  const across = flat ? BOXES : DOTS;
  return { flat, row: Math.floor(index / across) + 1, col: (index % across) + 1 };
}

class Scene {
  constructor(context, { wake = () => {}, now = () => globalThis.performance?.now?.() ?? Date.now(), still = () => false } = {}) {
    Object.assign(this, { wake, now, still, ctx: context, key: signature(context.state), motion: null });
    this.drew = drawers(context.view?.round?.moves ?? []);
  }

  update(next) {
    const key = signature(next.state);
    if (key !== this.key) {
      const plan = planMove(this.ctx.state, next.state, next.last);
      this.motion = plan && !this.still() ? { plan, start: this.now(), heard: -1 } : null;
      this.key = key;
    }
    this.ctx = next;
    this.drew = drawers(next.view?.round?.moves ?? []);
  }

  label() {
    const [first, second] = count(this.ctx.state.boxes);
    return `${this.ctx.t("board")}: ${this.ctx.t("count", { first, second })}`;
  }

  buttons({ size = NOMINAL } = {}) {
    const { t, state, canPlay, pending, last } = this.ctx;
    const layout = layoutFor(size);
    const names = [t("markX"), t("markO")];
    return ORDER.map((line) => {
      const drawn = state.lines[line];
      const by = this.drew[line];
      const { flat, row, col } = placeOf(line);
      const status = !drawn ? t("free") : by === null ? t("drawn") : names[by];
      const marks = [[drawn && by !== null, `d${by}`], [line === last, "last"], [pending && line === last, "pending"]];
      const mark = marks.filter(([on]) => on).map(([, name]) => name).join(" ");
      return {
        key: line,
        box: fractionOf(touchBox(layout, line), size),
        label: `${t(flat ? "flatLine" : "uprightLine", { row, col })}: ${status}`,
        disabled: !(canPlay && !drawn),
        data: { line, mark: mark || null },
      };
    });
  }

  press(line) {
    if (this.ctx.canPlay && !this.ctx.state.lines[line]) this.ctx.play(line);
  }

  movingAt(now) {
    if (!this.motion) return null;
    const frame = moveFrame(this.motion.plan, now - this.motion.start);
    return frame.done ? null : { plan: this.motion.plan, frame };
  }

  view(now, { still = false, size = NOMINAL } = {}) {
    const { state, canPlay, pending, last } = this.ctx;
    const shown = Number.isInteger(last) ? last : null;
    const frame = still ? null : this.movingAt(now)?.frame;
    const popping = Object.fromEntries((frame?.pops ?? []).map(({ box, progress }) => [box, progress]));
    return {
      size,
      lines: state.lines,
      boxes: state.boxes,
      drawers: this.drew,
      open: Boolean(canPlay),
      last: shown,
      pending: pending && shown !== null && state.lines[shown] ? shown : null,
      moving: frame && frame.stroke < 1 ? { line: this.motion.plan.line, progress: frame.stroke } : null,
      popping,
      bursts: frame?.bursts ?? [],
      extra: extraTurn(state, shown).map((box) => ({ box, side: state.boxes[box], progress: popping[box] ?? 1 })),
    };
  }

  hear(now) {
    if (!this.motion) return;
    const elapsed = now - this.motion.start;
    for (const cue of cuesBetween(this.motion.plan, this.motion.heard, elapsed)) this.ctx.sound?.play(CUES[cue]);
    this.motion.heard = Math.max(this.motion.heard, elapsed);
  }

  draw(ctx, { size, theme, now, still }) {
    if (!still) this.hear(now);
    drawBoard(ctx, theme, this.view(now, { still, size }));
    if (!still && this.movingAt(now)) return 0;
    this.motion = null;
    return null;
  }
}

export const createScene = (context, options) => new Scene(context, options);
