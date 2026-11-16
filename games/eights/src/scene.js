import { fractionOf } from "../../../kit/src/tabletop/grid.js";
import { easeInOut, progressOf } from "../../../kit/src/tabletop/motion.js";
import { cueTimes, moveFrame, planMove } from "./moves.js";
import { cardName, suitName } from "./names.js";
import { backPlaces, drawTable, handPlaces, layoutFor } from "./paint.js";
import { cardMove, choices, handOrder } from "./picking.js";
import { CARDS, SUITS, isEight } from "./rules.js";
import { createSprites } from "./sprites.js";

const NOMINAL = 343;
const RETURN_MS = 180;
const PARK_MS = 1000;
const LEAST = 44;

const signature = (state) => [state.phase, state.pile.length, state.pile.at(-1), state.hands[0].length, state.hands[1].length, state.stock.length, state.next, state.suit, state.commit, state.seedB, state.passes].join("|");

function atLeast(box, size) {
  const [w, h] = [Math.max(box.w, LEAST), Math.max(box.h, LEAST)];
  const x = Math.min(Math.max(0, box.x - (w - box.w) / 2), size - w);
  const y = Math.min(Math.max(0, box.y - (h - box.h) / 2), size - h);
  return { x, y, w, h };
}

const centreOf = (box) => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 });

class Scene {
  constructor(context, { wake = () => {}, now = () => globalThis.performance?.now?.() ?? Date.now(), sprites = createSprites() } = {}) {
    Object.assign(this, { wake, now, sprites, ctx: context, key: signature(context.state), chosen: null, motion: null });
    Object.assign(this, { held: null, returning: null, parked: null, dropped: null, theme: null });
  }

  get me() {
    return this.ctx.mySide ?? null;
  }

  mine(state = this.ctx.state, me = this.me) {
    return me === null || state.phase === "shuffle" ? [] : handOrder(state.hands[me]);
  }

  theirs(state = this.ctx.state, me = this.me) {
    return me === null || state.phase === "shuffle" ? 0 : state.hands[1 - me].length;
  }

  choices() {
    return choices(this.ctx.state, this.me, this.ctx.canPlay);
  }

  picking() {
    return this.chosen !== null && this.choices().playable.includes(this.chosen);
  }

  update(next) {
    const key = signature(next.state);
    if (key !== this.key) {
      const before = this.ctx.state;
      const plan = planMove(before, next.state, next.last, next.mySide ?? null);
      const travel = next.last !== this.dropped;
      const seen = { mine: this.mine(before, next.mySide ?? null), theirs: this.theirs(before, next.mySide ?? null) };
      this.motion = plan ? { plan, start: this.now(), travel, before: seen } : null;
      for (const { cue, at } of plan ? cueTimes(plan, { travel }) : []) next.sound?.play(`eights-${cue}`, { delay: at / 1000 });
      Object.assign(this, { key, chosen: null, dropped: null, returning: null, parked: null });
    }
    if (!next.canPlay) this.chosen = null;
    this.ctx = next;
  }

  lastMover() {
    const { state, last } = this.ctx;
    return typeof last === "string" && state.phase !== "shuffle" ? 1 - state.next : null;
  }

  label() {
    const { t, state } = this.ctx;
    if (state.phase === "shuffle") return `${t("name")}: ${t("shuffling")}`;
    const parts = [];
    if (this.me !== null) parts.push(t("theirHand", { n: this.theirs() }));
    if (state.pile.length) parts.push(t("onTable", { card: cardName(state.pile.at(-1), t) }));
    if (state.suit !== null) parts.push(t("suitNow", { suit: suitName(state.suit, t) }));
    if (this.me !== null) parts.push(t("yourHand", { n: state.hands[this.me].length }));
    return `${t("name")}: ${parts.join(" · ")}`;
  }

  marks() {
    const { last, pending } = this.ctx;
    const played = typeof last === "string" && last[0] === "p";
    return { pile: pending && played ? "pending" : played && this.lastMover() !== this.me ? "last" : null, stock: pending && !played && last ? "pending" : null };
  }

  buttons({ size = NOMINAL } = {}) {
    const { t, state } = this.ctx;
    const layout = layoutFor(size, this.mine().length);
    const pick = this.choices();
    const place = (box) => fractionOf(atLeast(box, size), size);
    const marks = this.marks();
    const stock =
      state.phase === "shuffle"
        ? { key: "stock", box: place(layout.stock), label: t("shuffling"), disabled: true, data: {} }
        : state.stock.length
          ? { key: "stock", box: place(layout.stock), label: t("drawPile", { n: state.stock.length }), disabled: !pick.draw || this.picking(), data: { act: "draw", mark: marks.stock } }
          : { key: "stock", box: place(layout.stock), label: t("passTurn"), disabled: !pick.pass || this.picking(), data: { act: "pass", mark: marks.stock } };
    const suits = this.picking() ? layout.picker.chips.map(({ suit, x, y, r }) => ({ key: SUITS[suit], box: fractionOf({ x: x - r, y: y - r, w: r * 2, h: r * 2 }, size), label: suitName(suit, t), data: { suit: SUITS[suit] } })) : [];
    const list = [...suits, ...this.cardButtons(layout, pick, size), stock];
    if (state.pile.length) list.push({ key: "pile", box: place(layout.pile), label: t("onTable", { card: cardName(state.pile.at(-1), t) }), disabled: true, data: { pile: true, mark: marks.pile } });
    return list;
  }

  cardButtons(layout, pick, size) {
    const { t } = this.ctx;
    const mine = this.mine();
    return handPlaces(layout, mine, new Set(pick.playable)).map(({ card, reach }) => {
      const can = pick.playable.includes(card);
      const mark = [can && "can", card === this.chosen && "chosen"].filter(Boolean).join(" ");
      return { key: card, box: fractionOf(reach, size), label: t("playCard", { card: cardName(card, t) }), disabled: !can, data: { card, drag: can, mark: mark || null } };
    });
  }

  press(key) {
    const pick = this.choices();
    if (key === "stock") {
      if (this.picking()) return;
      if (pick.draw) this.ctx.play("d");
      else if (pick.pass) this.ctx.play("x");
      return;
    }
    if (SUITS.includes(key)) {
      if (!this.picking()) return;
      const move = cardMove(this.chosen, key);
      this.chosen = null;
      this.ctx.play(move);
      return;
    }
    if (!Number.isInteger(key) || key < 0 || key >= CARDS || !pick.playable.includes(key)) return;
    if (!isEight(key)) {
      this.chosen = null;
      this.ctx.play(cardMove(key));
      return;
    }
    this.chosen = this.chosen === key ? null : key;
    if (this.chosen !== null) this.ctx.sound?.play("eights-pick");
    this.wake();
  }

  canDrag(key) {
    return Number.isInteger(key) && this.choices().playable.includes(key);
  }

  dropTargets() {
    return ["pile"];
  }

  dragAt(card, point) {
    if (point) Object.assign(this, { held: { card, point }, returning: null, parked: null });
    else if (this.held) Object.assign(this, { returning: { ...this.held, start: this.now() }, held: null });
    this.wake();
  }

  drop(card, target) {
    const returning = this.returning;
    this.returning = null;
    if (target !== "pile" || !this.canDrag(card)) return;
    if (isEight(card)) {
      this.chosen = card;
      this.ctx.sound?.play("eights-pick");
      return;
    }
    const move = cardMove(card);
    Object.assign(this, { dropped: move, parked: returning && { ...returning, until: this.now() + PARK_MS } });
    this.ctx.play(move);
  }

  floatingAt(now, layout, view) {
    const held = this.held ?? (this.parked && now < this.parked.until ? this.parked : null);
    if (held && view.mine.includes(held.card)) {
      view.hidden.add(held.card);
      return { card: held.card, x: held.point.x, y: held.point.y };
    }
    if (!this.returning || !view.mine.includes(this.returning.card)) return null;
    const progress = progressOf(this.returning.start, RETURN_MS, now);
    if (progress >= 1) return null;
    const home = centreOf(handPlaces(layout, view.mine, view.lifted).find((one) => one.card === this.returning.card));
    const eased = easeInOut(progress);
    const { x, y } = this.returning.point;
    view.hidden.add(this.returning.card);
    return { card: this.returning.card, x: x + (home.x - x) * eased, y: y + (home.y - y) * eased };
  }

  view(now, { size = NOMINAL, still = false } = {}) {
    const { state } = this.ctx;
    const mine = this.mine();
    const layout = layoutFor(size, mine.length);
    const pick = this.choices();
    const marks = this.marks();
    const top = state.pile.at(-1);
    const view = {
      size,
      ratio: 1,
      mine,
      hidden: new Set(),
      lifted: new Set(pick.playable),
      playable: new Set(pick.playable),
      open: pick.open,
      chosen: this.picking() ? this.chosen : null,
      theirs: this.theirs(),
      arriving: 0,
      stock: state.phase === "shuffle" ? CARDS : state.stock.length,
      pile: state.pile.slice(-3),
      suit: top !== undefined && isEight(top) && state.suit !== null ? { suit: state.suit, progress: 1 } : null,
      lastTheirs: marks.pile === "last",
      pending: marks.pile === "pending" ? "pile" : marks.stock === "pending" ? "stock" : null,
      pass: pick.pass,
      drawHint: pick.open && pick.draw && !pick.playable.length,
      picking: this.picking(),
      passing: null,
      moving: null,
      floating: null,
    };
    if (!still && this.motion) this.animate(view, now, layout);
    view.floating = this.floatingAt(now, layout, view);
    return view;
  }

  animate(view, now, layout) {
    const { plan, start, travel, before } = this.motion;
    const frame = moveFrame(plan, now - start, { travel });
    if (frame.done) return;
    if (plan.kind === "play") this.flying(view, frame, layout, before);
    else if (plan.kind === "draw") this.drawing(view, frame, layout);
    else if (plan.kind === "pass") view.passing = frame.fade;
    else this.dealing(view, frame, layout);
  }

  flying(view, frame, layout, before) {
    const { plan } = this.motion;
    if (frame.progress >= 1) {
      if (plan.eight) view.suit = { suit: this.ctx.state.suit, progress: frame.suit };
      return;
    }
    const from = plan.mine
      ? handPlaces(layoutFor(view.size, before.mine.length), before.mine).find((one) => one.card === plan.card)
      : backPlaces(layout, before.theirs).backs.at(-1);
    Object.assign(view, { pile: this.ctx.state.pile.slice(-4, -1), suit: null, lastTheirs: false });
    view.moving = { card: plan.card, from: from ?? layout.stock, to: layout.pile, progress: frame.progress, flip: !plan.mine };
  }

  drawing(view, frame, layout) {
    const { plan } = this.motion;
    if (plan.mine) {
      const to = handPlaces(layout, view.mine, view.lifted).find((one) => one.card === plan.card);
      view.hidden.add(plan.card);
      view.moving = { card: plan.card, from: layout.stock, to: to ?? layout.pile, progress: frame.progress, flip: true };
      return;
    }
    view.arriving = 1;
    view.moving = { card: null, from: layout.stock, to: backPlaces(layout, view.theirs).backs.at(-1), progress: frame.progress, flip: false };
  }

  dealing(view, frame, layout) {
    const { plan } = this.motion;
    const me = this.me;
    const dealtOrder = me === null ? [] : this.ctx.state.hands[me];
    const stepOf = (side, index) => 2 * index + (side === 1 ? 0 : 1);
    const arrived = (side, index) => stepOf(side, index) < frame.dealt;
    dealtOrder.forEach((card, index) => !arrived(me, index) && view.hidden.add(card));
    const theirsIn = Array.from({ length: view.theirs }, (_, index) => arrived(1 - me, index)).filter(Boolean).length;
    Object.assign(view, { theirs: theirsIn, stock: view.stock + plan.count - frame.dealt + 1, pile: [], suit: null, lastTheirs: false, pass: false, drawHint: false });
    if (frame.dealt < plan.count) {
      const side = frame.dealt % 2 === 0 ? 1 : 0;
      const target = side === me ? handPlaces(layout, view.mine, view.lifted).find((one) => one.card === dealtOrder[Math.floor(frame.dealt / 2)]) : backPlaces(layout, theirsIn + 1).backs.at(-1);
      view.moving = { card: null, from: layout.stock, to: target ?? layout.pile, progress: frame.step, flip: false };
      return;
    }
    view.stock -= 1;
    view.moving = { card: this.ctx.state.pile[0], from: layout.stock, to: layout.pile, progress: frame.flip, flip: true };
  }

  draw(ctx, { size, theme, now, still }) {
    if (theme !== this.theme) {
      this.sprites.clear();
      this.theme = theme;
    }
    const view = this.view(now, { size, still });
    view.ratio = ctx.getTransform?.().a ?? 1;
    drawTable(ctx, theme, view, this.sprites);
    if (this.motion && (still || moveFrame(this.motion.plan, now - this.motion.start, { travel: this.motion.travel }).done)) this.motion = null;
    return this.motion || view.floating || (this.parked && now < this.parked.until) ? 0 : null;
  }
}

export const createScene = (context, options) => new Scene(context, options);
