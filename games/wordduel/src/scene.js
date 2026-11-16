import { fractionOf } from "../../../kit/src/tabletop/grid.js";
import { flipAt, flipsOver, newlyAnswered } from "./moves.js";
import { drawBoard, layoutFor, tileBox } from "./paint.js";
import { LENGTH, MAX_GUESSES, honestAnswer, solvedAt, turn } from "./rules.js";

const SOLVED = "g".repeat(LENGTH);
const MARK_NAMES = { g: "right", y: "near", b: "wrong" };

class Scene {
  constructor(context, { now = () => globalThis.performance?.now?.() ?? Date.now(), still = () => false } = {}) {
    Object.assign(this, { now, still, ctx: context, round: context.view?.index, flips: [] });
    this.seen = this.answered();
  }

  get me() {
    return this.ctx.mySide ?? 0;
  }

  get phase() {
    return this.ctx.state.phase === "place" ? "place" : "play";
  }

  committed() {
    return this.ctx.state.commits[this.me] !== null;
  }

  canGuess() {
    const { state, canPlay, mySide } = this.ctx;
    return Boolean(canPlay && mySide !== null && state.phase === "guess" && state.guesses[this.me].length < MAX_GUESSES && solvedAt(state, this.me) === null);
  }

  answered() {
    const { state, own } = this.ctx;
    const me = this.me;
    const theirs = state.answers[me].slice();
    const owes = state.phase === "guess" && state.guesses[1 - me].length > theirs.length;
    if (owes && own?.word) theirs.push(honestAnswer(state, me, own.word));
    return { mine: state.answers[1 - me], theirs, secret: [this.committed() ? SOLVED : ""] };
  }

  update(next) {
    this.ctx = next;
    const answered = this.answered();
    if (next.view?.index !== this.round) this.flips = [];
    else if (!this.still()) this.flips.push(...newlyAnswered(this.seen, answered).map((row) => ({ ...row, start: this.now() })));
    Object.assign(this, { round: next.view?.index, seen: answered });
  }

  rows(grid) {
    const { state, own, pending } = this.ctx;
    const side = grid === "mine" ? this.me : 1 - this.me;
    const guesses = state.guesses[side];
    const answers = this.seen[grid];
    const rows = guesses.map((word, row) => ({ word, answer: answers[row] ?? "", pending: grid === "mine" && pending && row === guesses.length - 1 && !answers[row] }));
    if (grid === "mine" && own?.typed && this.canGuess()) rows.push({ word: own.typed, typing: true });
    return rows;
  }

  secret() {
    const { own, pending } = this.ctx;
    if (this.committed()) return { side: this.me, word: own?.word ?? "", answer: SOLVED, pending };
    return { side: this.me, word: own?.typed || own?.word || "", typing: Boolean(own?.typed) };
  }

  label() {
    const { t } = this.ctx;
    return this.phase === "place" ? t("yourSecret") : `${t("yourGuesses")} · ${t("theirGuesses")}`;
  }

  tileButtons(grid, layout, rows, size) {
    const { t } = this.ctx;
    const found = [];
    rows.forEach(({ word, answer = "", pending = false, typing = false }, row) => {
      if (typing && grid !== "secret") return;
      [...word].forEach((letter, col) => {
        const mark = answer[col] ?? "";
        found.push({
          key: `${grid}-${row}-${col}`,
          box: fractionOf(tileBox(layout, row, col), size),
          label: `${letter.toUpperCase()}: ${t(MARK_NAMES[mark] ?? "unanswered")}`,
          disabled: true,
          data: { grid, row, col, mark: [mark, pending && "pending"].filter(Boolean).join(" ") || null },
        });
      });
    });
    return found;
  }

  badgeButton(grid, layout, label, size) {
    const { x, y, size: across } = layout.badge;
    return { key: grid, box: fractionOf({ x: x - across / 2, y: y - across / 2, w: across, h: across }, size), label, disabled: true, data: { grid } };
  }

  buttons({ size = 352 } = {}) {
    const { t } = this.ctx;
    const layout = layoutFor(size, this.phase);
    if (this.phase === "place") return [this.badgeButton("secret", layout.row, t("yourSecret"), size), ...this.tileButtons("secret", layout.row, [this.secret()], size)];
    return [
      this.badgeButton("mine", layout.mine, t("yourGuesses"), size),
      ...this.tileButtons("mine", layout.mine, this.rows("mine"), size),
      this.badgeButton("theirs", layout.theirs, t("theirGuesses"), size),
      ...this.tileButtons("theirs", layout.theirs, this.rows("theirs"), size),
    ];
  }

  press() {}

  flipsOf(grid, row, now) {
    const flip = this.flips.find((one) => one.grid === grid && one.row === row);
    return flip ? Array.from({ length: LENGTH }, (_, column) => flipAt(now - flip.start, column)) : null;
  }

  view(now, size) {
    const { state } = this.ctx;
    const who = ["place", "guess"].includes(state.phase) ? turn(state) : null;
    const flipped = (grid, rows) => rows.map((row, at) => ({ ...row, flips: this.flipsOf(grid, at, now) }));
    if (this.phase === "place") return { size, phase: "place", turn: who, secret: { ...this.secret(), flips: this.flipsOf("secret", 0, now) } };
    return {
      size,
      phase: "play",
      turn: who,
      mine: { side: this.me, rows: flipped("mine", this.rows("mine")) },
      theirs: { side: 1 - this.me, rows: flipped("theirs", this.rows("theirs")) },
    };
  }

  draw(ctx, { size, theme, now, still }) {
    if (still) this.flips = [];
    this.flips = this.flips.filter((flip) => !flipsOver(now - flip.start));
    drawBoard(ctx, theme, this.view(now, size));
    return this.flips.length ? 0 : null;
  }
}

export const createScene = (context, options) => new Scene(context, options);
