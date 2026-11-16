import { cellBox, cellCentre, fractionOf } from "../../../kit/src/tabletop/grid.js";
import { easeInOut, progressOf } from "../../../kit/src/tabletop/motion.js";
import { drawBoard, layoutFor } from "./paint.js";
import { choices, dropOn, tap } from "./picking.js";
import { MOVE_MS, SHAKE_MS, cuesBetween, moveFrame, planMove, shakeAt } from "./moves.js";
import { PROMOTIONS, promotionLayout } from "./promotion.js";
import { SIDE, cellOf, cellsOf, colourOf, kingCell, nameOf, typeOf } from "./squares.js";

const RETURN_MS = 180;
const PARK_MS = 1000;
const NOMINAL = 320;
const PROMOTE = "promote-";
const NAMES = { k: "king", q: "queen", r: "rook", b: "bishop", n: "knight", p: "pawn" };
const WHOLE = Object.freeze({ x: 0, y: 0, w: 1, h: 1 });

const toMove = (fen) => (fen.split(" ")[1] === "w" ? 0 : 1);
const squaresOf = (uci) => (typeof uci === "string" && uci.length >= 4 ? [uci.slice(0, 2), uci.slice(2, 4)] : null);

class Scene {
  constructor(context, { wake = () => {}, now = () => globalThis.performance?.now?.() ?? Date.now(), still = () => false } = {}) {
    Object.assign(this, { wake, now, still, ctx: context, key: context.state.fen, from: null, offer: null, promoting: null });
    Object.assign(this, { motion: null, held: null, returning: null, parked: null, dropped: null, shakes: [] });
  }

  get flipped() {
    return this.ctx.mySide === 1;
  }

  get playable() {
    return Boolean(this.ctx.canPlay && !this.ctx.result);
  }

  offerFor(from) {
    return choices(this.ctx.state.fen, this.ctx.mySide, this.playable, from);
  }

  choices() {
    this.offer ??= this.offerFor(this.from);
    return this.offer;
  }

  update(next) {
    const key = next.state.fen;
    if (key !== this.key) {
      const plan = planMove(this.key, key, next.last);
      const [start, quiet] = [this.now(), this.still()];
      this.motion = plan && !quiet ? { plan, start, travel: next.last !== this.dropped, heard: -1 } : null;
      const king = next.state.check ? kingCell(cellsOf(key), toMove(key)) : null;
      this.shakes = king !== null && !quiet ? [{ cell: king, start: start + (this.motion?.travel ? MOVE_MS : 0) }] : [];
      Object.assign(this, { key, from: null, promoting: null, dropped: null, parked: null, returning: null });
    }
    this.ctx = next;
    if (!this.playable) Object.assign(this, { from: null, promoting: null });
    this.offer = null;
  }

  label() {
    const { t, state } = this.ctx;
    if (this.promoting) return t("choosePromotion");
    return state.check ? `${t("board")} · ${t("check")}` : t("board");
  }

  checkSquare(cells) {
    const cell = this.ctx.state.check ? kingCell(cells, toMove(this.ctx.state.fen)) : null;
    return cell === null ? null : nameOf(cell);
  }

  buttons({ size = NOMINAL } = {}) {
    return this.promoting ? this.choiceButtons(size) : this.squareButtons(size);
  }

  choiceButtons(size) {
    const { t } = this.ctx;
    const { choices: offered } = promotionLayout(layoutFor(size).grid);
    return [
      { key: "cancel", box: WHOLE, label: t("cancel"), data: { cancel: true } },
      ...offered.map(({ type, box }) => ({ key: `${PROMOTE}${type}`, box: fractionOf(box, size), label: t(NAMES[type]), data: { promote: type } })),
    ];
  }

  labelOf(name, piece) {
    const { t } = this.ctx;
    if (!piece) return t("emptySquare", { square: name });
    return t("onSquare", { square: name, piece: t(NAMES[typeOf(piece)]), side: t(colourOf(piece) ? "black" : "white") });
  }

  marksOf(name, offer, seen) {
    const target = offer.targets.find((one) => one.square === name);
    const marks = [[this.from === name, "from"], [offer.movable.includes(name), "can"], [Boolean(target), "to"], [Boolean(target?.capture), "take"], [seen.last.includes(name), "last"], [seen.pending === name, "pending"], [seen.check === name, "check"]];
    return marks.filter(([on]) => on).map(([, mark]) => mark).join(" ") || null;
  }

  squareButtons(size) {
    const offer = this.choices();
    const cells = cellsOf(this.ctx.state.fen);
    const { grid } = layoutFor(size);
    const last = squaresOf(this.ctx.last) ?? [];
    const seen = { last, pending: this.ctx.pending ? last[1] : null, check: this.checkSquare(cells) };
    const found = [];
    for (let shown = 0; shown < SIDE * SIDE; shown += 1) {
      const cell = this.flipped ? SIDE * SIDE - 1 - shown : shown;
      const [name, piece] = [nameOf(cell), cells[cell]];
      const open = offer.own.includes(name) || offer.targets.some((one) => one.square === name);
      found.push({
        key: name,
        box: fractionOf(cellBox(grid, cell, { flipped: this.flipped }), size),
        label: this.labelOf(name, piece),
        disabled: !open,
        data: { square: name, piece: piece ? `${colourOf(piece) ? "b" : "w"}${typeOf(piece)}` : null, drag: this.canDrag(name), mark: this.marksOf(name, offer, seen) },
      });
    }
    return found;
  }

  press(key) {
    if (this.promoting) {
      this.choose(key);
      return;
    }
    const before = this.from;
    const { from, move, promote, miss } = tap(this.choices(), this.from, key);
    Object.assign(this, { from, offer: null });
    if (move) {
      this.ctx.play(move);
      return;
    }
    if (promote) this.promoting = promote;
    if (miss) this.shakes = [...this.shakes.filter((one) => one.cell !== cellOf(miss)), { cell: cellOf(miss), start: this.now() }];
    if (from && from !== before) this.ctx.sound?.play("chess-pick");
    this.wake();
  }

  choose(key) {
    const { from, to } = this.promoting;
    const type = typeof key === "string" && key.startsWith(PROMOTE) ? key.slice(PROMOTE.length) : null;
    Object.assign(this, { promoting: null, offer: null });
    if (PROMOTIONS.includes(type)) this.ctx.play(`${from}${to}${type}`);
    this.wake();
  }

  canDrag(name) {
    return Boolean(!this.promoting && this.playable && this.choices().movable.includes(name));
  }

  dropTargets(name) {
    return this.offerFor(name).targets.map((one) => one.square);
  }

  dragAt(name, point) {
    if (point) Object.assign(this, { held: { cell: cellOf(name), point }, returning: null });
    else if (this.held) Object.assign(this, { returning: { ...this.held, start: this.now() }, held: null });
    this.wake();
  }

  drop(name, target) {
    const landed = dropOn(this.offerFor(name), name, target);
    this.offer = null;
    if (!landed) return;
    if (landed.promote) {
      Object.assign(this, { promoting: landed.promote, returning: null, from: null });
      this.wake();
      return;
    }
    Object.assign(this, { parked: this.returning && { ...this.returning, until: this.now() + PARK_MS }, returning: null, from: null, dropped: landed.move });
    this.ctx.play(landed.move);
  }

  floatingAt(now, size) {
    const { grid, piece: tall } = layoutFor(size);
    const cells = cellsOf(this.ctx.state.fen);
    const lift = tall * 0.2;
    const held = this.held ?? (this.parked && now < this.parked.until ? this.parked : null);
    if (held) return { cell: held.cell, piece: cells[held.cell], x: held.point.x, y: held.point.y, lift };
    if (!this.returning) return null;
    const progress = progressOf(this.returning.start, RETURN_MS, now);
    if (progress >= 1) return null;
    const home = cellCentre(grid, this.returning.cell, { flipped: this.flipped });
    const eased = easeInOut(progress);
    const { x, y } = this.returning.point;
    return { cell: this.returning.cell, piece: cells[this.returning.cell], x: x + (home.x - x) * eased, y: y + (home.y - y) * eased, lift: lift * (1 - eased) };
  }

  movingAt(now) {
    if (!this.motion) return null;
    const { plan, start, travel } = this.motion;
    const frame = moveFrame(plan, now - start, { travel });
    return frame.done ? null : { plan, frame };
  }

  shaking(now, still) {
    return !still && this.shakes.some(({ start }) => now < start + SHAKE_MS);
  }

  shakesAt(now, still) {
    if (still) return [];
    return this.shakes.filter(({ start }) => now >= start && now < start + SHAKE_MS).map(({ cell, start }) => ({ cell, offset: shakeAt(now - start) }));
  }

  travelling(motion, floating) {
    const hidden = floating ? [floating.cell] : [];
    if (!motion) return { moving: [], paths: [], standing: [], bursts: [], hidden };
    const { plan, frame } = motion;
    const travelling = frame.progress < 1;
    const legs = [plan, plan.rook].filter(Boolean).map(({ piece, from, to }) => ({ piece, from: cellOf(from), to: cellOf(to), progress: easeInOut(frame.progress) }));
    return {
      moving: travelling ? legs : [],
      paths: travelling && plan.rook ? legs.map(({ from, to }) => ({ from, to, progress: frame.progress })) : [],
      standing: frame.standing.map(({ square, piece }) => ({ cell: cellOf(square), piece })),
      bursts: frame.bursts.map(({ square, progress }) => ({ cell: cellOf(square), progress })),
      hidden: travelling ? [...hidden, ...legs.map((one) => one.to)] : hidden,
    };
  }

  view(now, { still = false, size = NOMINAL } = {}) {
    const cells = cellsOf(this.ctx.state.fen);
    const floating = this.floatingAt(now, size);
    const last = squaresOf(this.ctx.last)?.map(cellOf) ?? null;
    const check = this.checkSquare(cells);
    return {
      size,
      flipped: this.flipped,
      cells,
      last,
      pending: this.ctx.pending && last ? last[1] : null,
      selected: this.from ? cellOf(this.from) : null,
      targets: this.choices().targets.map(({ square, capture }) => ({ cell: cellOf(square), capture })),
      check: check ? cellOf(check) : null,
      shakes: this.shakesAt(now, still),
      ...this.travelling(still ? null : this.movingAt(now), floating),
      floating,
      promoting: this.promoting ? this.ctx.mySide : null,
    };
  }

  hear(now) {
    if (!this.motion) return;
    const elapsed = now - this.motion.start;
    for (const cue of cuesBetween(this.motion.plan, this.motion.heard, elapsed, { travel: this.motion.travel })) if (cue === "capture") this.ctx.sound?.play("chess-take");
    this.motion.heard = Math.max(this.motion.heard, elapsed);
  }

  draw(ctx, { size, theme, now, still }) {
    const view = this.view(now, { still, size });
    if (!still) this.hear(now);
    drawBoard(ctx, theme, view);
    if ((!still && this.movingAt(now)) || view.floating || this.shaking(now, still)) return 0;
    Object.assign(this, { motion: null, shakes: [] });
    return null;
  }
}

export const createScene = (context, options) => new Scene(context, options);
