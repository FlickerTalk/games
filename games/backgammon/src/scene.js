import { fractionOf } from "../../../kit/src/tabletop/grid.js";
import { easeInOut, progressOf } from "../../../kit/src/tabletop/motion.js";
import { diceFaces } from "./dice.js";
import { NOMINAL, barBox, diceBox, layoutFor, pointBox, trayBox } from "./layout.js";
import { SHAKE_MS, cuesBetween, moveFrame, planChange, shakeAt, timeline } from "./moves.js";
import { drawTable, spotOf } from "./paint.js";
import { BAR, OFF, cannotMove, choices, dropOn, lastTurn, placeOf, tap, targetsOf } from "./picking.js";
import { pips } from "./rules.js";

const RETURN_MS = 180;
const PARK_MS = 1000;
const PULSE_MS = 66;
const MAX_QUEUE = 8;
const SOUNDS = { move: "bg-move", hit: "bg-hit", dice: "bg-dice" };
const THEIR_BAR = "their-bar";
const THEIR_OFF = "their-off";
const PASS = "pass";

const signature = (state) => JSON.stringify([state.points, state.bar, state.off, state.next, state.dice, state.left, state.end]);
const tableOf = (state) => ({ points: state.points.map((point) => [...point]), bar: [...state.bar], off: [...state.off] });
const range = (from, to) => Array.from({ length: Math.abs(to - from) + 1 }, (_, at) => (from <= to ? from + at : from - at));

function leaving({ from, side, after }) {
  const left = from === "b" ? after.bar[side] : after.points[from][side];
  return { place: from, index: left, count: left + 1 };
}

function landing({ to, side, after }) {
  const count = to === "o" ? after.off[side] : after.points[to][side];
  return { place: to, index: (to === "o" ? Math.min(count, 5) : count) - 1, count };
}

function moveScene(plan, frame) {
  const { side, to, hit, after } = plan;
  const other = 1 - side;
  const table = tableOf(after);
  const shown = { table, flying: [], hitRing: null, dice: { side, ...diceFaces(plan.dice, plan.left), tumble: null } };
  if (frame.progress < 1) {
    if (to === "o") table.off[side] -= 1;
    else table.points[to][side] -= 1;
    if (hit) {
      table.points[to][other] = 1;
      table.bar[other] -= 1;
    }
    shown.flying.push({ side, from: leaving(plan), to: landing(plan), progress: frame.progress });
  } else if (frame.hit !== null && frame.hit < 1) {
    table.bar[other] -= 1;
    const count = after.bar[other];
    shown.flying.push({ side: other, from: { place: to, index: 0, count: 1 }, to: { place: "b", index: count - 1, count }, progress: frame.hit });
    shown.hitRing = { place: to, side, progress: frame.hit };
  }
  return shown;
}

function planScene(item, now) {
  const { plan, start, travel } = item;
  const frame = moveFrame(plan, Math.max(0, now - start), { travel });
  if (plan.kind === "move") return moveScene(plan, frame);
  const faces = diceFaces(plan.dice, plan.kind === "roll" ? plan.after.left : []);
  const used = plan.kind === "pass" ? faces.used.map(() => true) : faces.used;
  return { table: tableOf(plan.after), flying: [], hitRing: null, dice: { side: plan.side, faces: faces.faces, used, tumble: plan.kind === "roll" ? frame.tumble : null } };
}

class Scene {
  constructor(context, { wake = () => {}, now = () => globalThis.performance?.now?.() ?? Date.now(), still = () => false } = {}) {
    Object.assign(this, { wake, now, still, ctx: context, key: signature(context.state), round: context.view?.index ?? 0 });
    Object.assign(this, { chosen: null, offer: null, queue: [], shakes: [], held: null, returning: null, parked: null, dropped: null });
  }

  get me() {
    return this.ctx.mySide ?? 0;
  }

  get mirrored() {
    return this.me === 1;
  }

  choices() {
    this.offer ??= choices(this.ctx.state, this.ctx.mySide, this.ctx.canPlay && !this.ctx.state.end);
    return this.offer;
  }

  targets() {
    return this.chosen === null ? [] : targetsOf(this.choices().legal, this.chosen);
  }

  canPass() {
    const { state, canPlay } = this.ctx;
    return Boolean(canPlay && state.dice && !state.end && state.next === this.ctx.mySide && !this.choices().legal.length);
  }

  update(next) {
    const key = signature(next.state);
    const round = next.view?.index ?? 0;
    if (key !== this.key) {
      this.enqueue(round === this.round ? planChange(this.ctx.state, next.state, next.last) : null, next);
      Object.assign(this, { key, chosen: null, dropped: null, parked: null, returning: null, shakes: [] });
    }
    this.round = round;
    this.ctx = next;
    if (!next.canPlay) this.chosen = null;
    this.offer = null;
  }

  enqueue(plan, next) {
    const now = this.now();
    this.queue = this.queue.filter((item) => now < item.start + item.total);
    const travel = !(plan?.kind === "move" && next.last === this.dropped);
    if (plan && this.still()) for (const { name } of timeline(plan, { travel }).cues) next.sound?.play(SOUNDS[name]);
    if (!plan || this.still() || this.queue.length >= MAX_QUEUE) {
      this.queue = [];
      return;
    }
    const previous = this.queue.at(-1);
    const start = previous ? Math.max(now, previous.start + previous.total) : now;
    this.queue.push({ plan, start, total: timeline(plan, { travel }).total, travel, heard: -1 });
  }

  activeAt(now) {
    return this.queue.find((item) => now < item.start + item.total) ?? null;
  }

  label() {
    const { t, state } = this.ctx;
    if (state.dice) return `${t("name")} · ${t("dice", { a: state.dice[0], b: state.dice[1] })}`;
    return state.end ? t("name") : `${t("name")} · ${t("rolling")}`;
  }

  keyOf(place, side) {
    if (place === "b") return side === this.me ? BAR : THEIR_BAR;
    if (place === "o") return side === this.me ? OFF : THEIR_OFF;
    return place;
  }

  lastMoves() {
    return lastTurn(this.ctx.view?.round?.moves ?? []);
  }

  pendingPlace() {
    if (!this.ctx.pending) return null;
    return this.lastMoves().filter((move) => move.side === this.me).at(-1)?.to ?? null;
  }

  marksOf(key, offer, seen) {
    const target = seen.targets.includes(key);
    const hit = target && typeof key === "number" && this.ctx.state.points[key][1 - this.me] === 1;
    const marks = [[this.chosen === null && offer.sources.includes(key), "can"], [this.chosen === key, "from"], [target, "to"], [hit, "hit"], [seen.last.has(key), "last"], [seen.pending === key, "pending"]];
    return marks.filter(([on]) => on).map(([, name]) => name).join(" ") || null;
  }

  pointLabel(point) {
    const { t, state } = this.ctx;
    const here = state.points[point];
    const side = here[0] ? 0 : here[1] ? 1 : null;
    const name = t("point", { n: point + 1 });
    return side === null ? `${name}: ${t("emptyPoint")}` : `${name}: ${t("checkers", { n: here[side] })} ${side === this.me ? t("yours") : t("theirs")}`;
  }

  pointButton(point, layout, offer, seen) {
    const { t, canPlay } = this.ctx;
    const source = offer.sources.includes(point);
    const target = seen.targets.includes(point);
    return {
      key: point,
      box: fractionOf(pointBox(layout, point, { mirrored: this.mirrored }), layout.size),
      label: target ? t("moveTo", { n: point + 1 }) : this.pointLabel(point),
      disabled: !(canPlay && (source || target || this.chosen === point || offer.own.includes(point))),
      data: { point, from: this.chosen === null && source ? point : null, to: target ? point : null, drag: this.canDrag(point), mark: this.marksOf(point, offer, seen) },
    };
  }

  barButton(mine, layout, offer, seen) {
    const { t, state, canPlay } = this.ctx;
    const key = mine ? BAR : THEIR_BAR;
    const source = mine && offer.sources.includes(BAR);
    return {
      key,
      box: fractionOf(barBox(layout, mine), layout.size),
      label: t("bar", { n: state.bar[mine ? this.me : 1 - this.me] }),
      disabled: !(canPlay && mine && (source || this.chosen === BAR || offer.own.includes(BAR))),
      data: { point: mine ? "b" : "b2", from: source && this.chosen === null ? "b" : null, drag: mine && this.canDrag(BAR), mark: this.marksOf(key, offer, seen) },
    };
  }

  trayButton(mine, layout, offer, seen) {
    const { t, state, canPlay } = this.ctx;
    const key = mine ? OFF : THEIR_OFF;
    const side = mine ? this.me : 1 - this.me;
    const target = mine && seen.targets.includes(OFF);
    return {
      key,
      box: fractionOf(trayBox(layout, mine), layout.size),
      label: target ? t("bearOff") : t("off", { n: state.off[side] }),
      disabled: !(canPlay && target),
      data: { tray: side, to: target ? "o" : null, mark: this.marksOf(key, offer, seen) },
    };
  }

  buttonFor(key, layout, offer, seen) {
    if (key === BAR || key === THEIR_BAR) return this.barButton(key === BAR, layout, offer, seen);
    if (key === OFF || key === THEIR_OFF) return this.trayButton(key === OFF, layout, offer, seen);
    return this.pointButton(key, layout, offer, seen);
  }

  buttons({ size = NOMINAL } = {}) {
    const layout = layoutFor(size);
    const offer = this.choices();
    const last = this.lastMoves();
    const seen = { targets: this.targets(), last: new Set(last.flatMap(({ from, to, side }) => [this.keyOf(from, side), this.keyOf(to, side)])), pending: this.keyOf(this.pendingPlace(), this.me) };
    const shown = (from, to) => range(from, to).map((at) => (this.mirrored ? 23 - at : at));
    const order = [...shown(12, 17), THEIR_BAR, ...shown(18, 23), THEIR_OFF, ...shown(11, 6), BAR, ...shown(5, 0), OFF];
    const found = order.map((key) => this.buttonFor(key, layout, offer, seen));
    if (this.canPass()) found.push({ key: PASS, box: fractionOf(diceBox(layout), size), label: this.ctx.t("pass"), disabled: false, data: { act: "pass" } });
    return found;
  }

  press(key) {
    if (key === PASS) {
      if (this.canPass()) this.ctx.play("x");
      return;
    }
    const offer = this.choices();
    const before = this.chosen;
    const { chosen, move } = tap(offer.legal, this.chosen, key);
    if (move) {
      Object.assign(this, { chosen, offer: null });
      this.ctx.play(move);
      return;
    }
    if (cannotMove(offer, key)) this.shakes = [...this.shakes.filter((one) => one.key !== key), { key, start: this.now() }];
    else Object.assign(this, { chosen, offer: null });
    if (this.chosen !== null && this.chosen !== before) this.ctx.sound?.play("bg-pick");
    this.wake();
  }

  canDrag(key) {
    return Boolean(this.ctx.canPlay && this.choices().sources.includes(key));
  }

  dropTargets(key) {
    return targetsOf(this.choices().legal, key);
  }

  dragAt(key, point) {
    if (point) Object.assign(this, { held: { key, point }, returning: null });
    else if (this.held) Object.assign(this, { returning: { ...this.held, start: this.now() }, held: null });
    this.wake();
  }

  drop(key, target) {
    const move = dropOn(this.choices().legal, key, target);
    this.offer = null;
    if (!move) return;
    Object.assign(this, { parked: this.returning && { ...this.returning, until: this.now() + PARK_MS }, returning: null, chosen: null, dropped: move });
    this.ctx.play(move);
  }

  homeOf(key, layout) {
    const place = placeOf(key);
    const state = this.ctx.state;
    const count = place === "b" ? state.bar[this.me] : state.points[place][this.me];
    return spotOf(layout, { me: this.me, mirrored: this.mirrored }, this.me, { place, index: Math.max(0, count - 1), count: Math.max(1, count) });
  }

  floatingAt(now, size) {
    const layout = layoutFor(size);
    const lift = layout.radius * 0.45;
    const held = this.held ?? (this.parked && now < this.parked.until ? this.parked : null);
    if (held) return { key: held.key, side: this.me, x: held.point.x, y: held.point.y, lift };
    if (!this.returning) return null;
    const progress = progressOf(this.returning.start, RETURN_MS, now);
    if (progress >= 1) return null;
    const home = this.homeOf(this.returning.key, layout);
    const eased = easeInOut(progress);
    const { x, y } = this.returning.point;
    return { key: this.returning.key, side: this.me, x: x + (home.x - x) * eased, y: y + (home.y - y) * eased, lift: lift * (1 - eased) };
  }

  restingDice() {
    const { state } = this.ctx;
    if (state.dice) {
      const { faces, used } = diceFaces(state.dice, state.left);
      return { side: state.next, faces, used: this.canPass() ? used.map(() => true) : used, tumble: null };
    }
    return state.end ? null : { side: state.next, faces: [1, 1], used: [false, false], waiting: true, tumble: null };
  }

  choiceView(idle) {
    if (!idle) return { sources: [], chosen: null, targets: [] };
    const { state } = this.ctx;
    const targets = this.targets().map((key) => ({ place: placeOf(key), hit: typeof key === "number" && state.points[key][1 - this.me] === 1 }));
    return { sources: this.chosen === null ? this.choices().sources.map(placeOf) : [], chosen: this.chosen === null ? null : placeOf(this.chosen), targets };
  }

  view(now, { still = false, size = NOMINAL } = {}) {
    const item = still ? null : this.activeAt(now);
    const state = this.ctx.state;
    const shown = item ? planScene(item, now) : { table: tableOf(state), flying: [], hitRing: null, dice: this.restingDice() };
    const floating = this.floatingAt(now, size);
    if (floating) {
      const place = placeOf(floating.key);
      if (place === "b") shown.table.bar[this.me] -= 1;
      else shown.table.points[place][this.me] -= 1;
    }
    const base = item ? item.plan.after : state;
    const pending = item ? null : this.pendingPlace();
    return {
      size,
      mirrored: this.mirrored,
      me: this.me,
      time: still ? 0 : now / 1000,
      ...shown.table,
      flying: shown.flying,
      hitRing: shown.hitRing,
      dice: shown.dice,
      ...this.choiceView(!item),
      last: item ? [] : this.lastMoves(),
      pending,
      faded: pending === null ? null : { place: pending, side: this.me },
      floating,
      shakes: this.shakesAt(now, still),
      pips: [pips(base, this.me), pips(base, 1 - this.me)],
    };
  }

  shakesAt(now, still) {
    if (still) return [];
    return this.shakes.filter(({ start }) => now >= start && now < start + SHAKE_MS).map(({ key, start }) => ({ place: placeOf(key), offset: shakeAt(now - start) }));
  }

  hear(now) {
    for (const item of this.queue) {
      const elapsed = now - item.start;
      for (const cue of cuesBetween(item.plan, item.heard, elapsed, { travel: item.travel })) this.ctx.sound?.play(SOUNDS[cue]);
      item.heard = Math.max(item.heard, elapsed);
    }
  }

  draw(ctx, { size, theme, now, still }) {
    const view = this.view(now, { still, size });
    if (!still) this.hear(now);
    drawTable(ctx, theme, view);
    if (view.floating || view.shakes.length || (!still && this.activeAt(now))) return 0;
    Object.assign(this, { queue: [], shakes: [] });
    if (still) return null;
    return view.chosen !== null || view.dice?.waiting ? PULSE_MS : null;
  }
}

export const createScene = (context, options) => new Scene(context, options);
