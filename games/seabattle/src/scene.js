import { cellBox, fractionOf } from "../../../kit/src/tabletop/grid.js";
import { storeKey } from "./keeper.js";
import { cuesBetween, effectFrame, planShots } from "./moves.js";
import { confirmBox, drawBoard, layoutFor } from "./paint.js";
import { aim, confirm, openCells } from "./picking.js";
import { CELLS, SALT_BYTES, SHIPS, SIZE, shipCells } from "./rules.js";
import { myWaters, theirWaters } from "./waters.js";

const PULSE_MS = 66;
const NOMINAL = 352;
const GHOST = "ghost";
const WHAT = { m: "miss", h: "hit", s: "sunk" };

const signature = (state) =>
  [state.phase, ...state.commits.map(Boolean), ...state.shots.map((list) => list.length), ...state.answers.map((list) => list.length), state.reveals.filter(Boolean).length].join(":");
const named = (cell) => ({ row: Math.floor(cell / SIZE) + 1, col: (cell % SIZE) + 1 });
const markOf = (marks) => marks.filter(([on]) => on).map(([, name]) => name).join(" ") || null;
const numbers = new Map();
const numberIn = (lang) => {
  if (!numbers.has(lang)) numbers.set(lang, new Intl.NumberFormat(lang));
  return numbers.get(lang);
};

class Scene {
  constructor(context, { wake = () => {}, now = () => globalThis.performance?.now?.() ?? Date.now(), still = () => false, random = Math.random } = {}) {
    Object.assign(this, { wake, now, still, random, ctx: context, key: signature(context.state), chosen: null, effects: [], told: "", auto: null, sealing: false });
    this.tell();
    this.settle();
  }

  get me() {
    return this.ctx.mySide ?? null;
  }

  get fleet() {
    return this.ctx.fleet ?? null;
  }

  get placing() {
    return this.ctx.state.phase === "place";
  }

  get committed() {
    return this.me !== null && this.ctx.state.commits[this.me] !== null;
  }

  get lost() {
    return this.committed && Boolean(this.fleet?.loaded) && !this.fleet.salt;
  }

  get canPlace() {
    return Boolean(this.ctx.canPlay) && this.placing && this.me !== null && !this.committed && Boolean(this.fleet?.loaded) && !this.sealing;
  }

  get canFire() {
    return Boolean(this.ctx.canPlay) && this.ctx.state.phase === "fire" && this.me !== null && Boolean(this.fleet?.loaded) && !this.lost;
  }

  shipsOf(context) {
    const fleet = context.fleet;
    const committed = context.mySide !== null && context.mySide !== undefined && context.state.commits[context.mySide] !== null;
    return fleet?.loaded && !(committed && !fleet.salt) ? fleet.ships : null;
  }

  update(next) {
    const key = signature(next.state);
    if (key !== this.key) {
      const plan = this.still() ? [] : planShots(this.ctx.state, next.state, next.mySide, this.shipsOf(next));
      this.effects = [...this.effects, ...plan.map((effect) => ({ ...effect, start: this.now(), heard: -1 }))];
      Object.assign(this, { key, chosen: null });
    }
    if (!next.canPlay) this.chosen = null;
    this.ctx = next;
    this.tell();
    this.settle();
  }

  tell() {
    const { t, notify } = this.ctx;
    const text = this.lost ? t("fleetLost") : this.canPlace ? t("placeFleet") : "";
    if (text && text !== this.told) notify?.(text);
    else if (!text && this.told === t("placeFleet")) notify?.(null);
    this.told = text;
  }

  settle() {
    const { state, canPlay } = this.ctx;
    const me = this.me;
    if (!canPlay || me === null || !this.fleet?.loaded || this.lost) return;
    const stamp = `${state.phase}:${state.shots[0].length}:${state.shots[1].length}:${state.answers[me].length}:${state.reveals.filter(Boolean).length}`;
    if (this.auto === stamp) return;
    if (state.phase === "fire") {
      const answer = this.fleet.answer(state, me);
      if (!answer.startsWith("s") || state.sunk[me].length + 1 !== SHIPS.length) return;
      this.auto = stamp;
      this.ctx.play(answer);
    } else if (state.phase === "reveal") {
      this.auto = stamp;
      this.ctx.play(this.fleet.reveal());
    }
  }

  theirs() {
    if (this.me === null) return { shots: new Map(), found: [], shown: [], last: null };
    return theirWaters(this.ctx.state, this.me);
  }

  mine() {
    if (this.me === null || this.placing) return { shots: new Map(), ships: (this.fleet?.ships ?? []).map((ship) => ({ ship, found: false })), last: null };
    return myWaters(this.ctx.state, this.me, this.shipsOf(this.ctx));
  }

  myFound(mine = this.mine()) {
    return mine.ships.length ? mine.ships.filter((one) => one.found).map((one) => one.ship) : this.ctx.state.sunk[this.me ?? 0];
  }

  pendingCell() {
    const { pending, last, state } = this.ctx;
    return pending && this.me !== null && String(last ?? "").includes(">") ? state.shots[this.me].at(-1) ?? null : null;
  }

  label() {
    const { t } = this.ctx;
    if (this.placing) return `${t("yourSea")}: ${t(this.lost ? "fleetLost" : this.committed ? "fleetWait" : "placeFleet")}`;
    const afloat = (found) => t("shipsLeft", { n: SHIPS.length - found });
    return `${t("theirSea")}: ${afloat(this.theirs().found.length)} · ${t("yourSea")}: ${afloat(this.myFound().length)}`;
  }

  seaButtons(layout, size) {
    const { t } = this.ctx;
    const waters = this.theirs();
    const open = this.canFire ? openCells(this.ctx.state, this.me) : new Set();
    const shown = new Set(waters.shown.flatMap(shipCells));
    const pending = this.pendingCell();
    return Array.from({ length: CELLS }, (_, cell) => {
      const what = WHAT[waters.shots.get(cell)] ?? (shown.has(cell) ? "ship" : null);
      const mark = markOf([[what, what], [cell === waters.last, "last"], [cell === pending, "pending"], [cell === this.chosen && open.has(cell), "chosen"]]);
      return {
        key: cell,
        box: fractionOf(cellBox(layout.fire.theirs.grid, cell), size),
        label: `${t("cell", named(cell))}: ${t(what ?? "unknown")}`,
        disabled: !open.has(cell),
        data: { cell, mark },
      };
    });
  }

  ownButtons(sea, size) {
    const { t } = this.ctx;
    const waters = this.mine();
    const ships = new Set(waters.ships.flatMap(({ ship }) => shipCells(ship)));
    return Array.from({ length: CELLS }, (_, cell) => {
      const what = WHAT[waters.shots.get(cell)] ?? null;
      const mark = markOf([[ships.has(cell), "ship"], [what, what], [cell === waters.last, "last"]]);
      return { key: `o${cell}`, box: fractionOf(cellBox(sea.grid, cell), size), label: `${t("cell", named(cell))}: ${t(what ?? (ships.has(cell) ? "ship" : "water"))}`, disabled: true, data: { own: cell, mark } };
    });
  }

  controlButtons({ shuffle, ready }, size) {
    if (this.committed) return [];
    const { t } = this.ctx;
    const box = ({ x, y, d }) => fractionOf({ x: x - d / 2, y: y - d / 2, w: d, h: d }, size);
    const disabled = !this.canPlace;
    return [
      { key: "shuffle", box: box(shuffle), label: t("shuffle"), disabled, data: { act: "shuffle" } },
      { key: "ready", box: box(ready), label: t("ready"), disabled, data: { act: "ready" } },
    ];
  }

  buttons({ size = NOMINAL } = {}) {
    const layout = layoutFor(size);
    if (this.placing) return [...this.ownButtons(layout.place.sea, size), ...this.controlButtons(layout.place, size)];
    const found = [...this.seaButtons(layout, size), ...this.ownButtons(layout.fire.mine, size)];
    if (this.canFire && this.chosen !== null) {
      found.push({ key: GHOST, box: fractionOf(confirmBox(layout, this.chosen), size), label: this.ctx.t("fireAt", named(this.chosen)), data: { ghost: this.chosen } });
    }
    return found;
  }

  press(key) {
    if (key === "shuffle") return this.shuffle();
    if (key === "ready") return this.ready();
    if (!this.canFire) return undefined;
    const open = openCells(this.ctx.state, this.me);
    const { chosen, fire } = key === GHOST ? confirm(this.chosen, open) : aim(this.chosen, key, open);
    const moved = chosen !== null && chosen !== this.chosen;
    this.chosen = chosen;
    if (fire !== null) {
      this.ctx.play(`${this.fleet.answer(this.ctx.state, this.me)}>${fire}`);
      return undefined;
    }
    if (moved) this.ctx.sound?.play("tap");
    this.wake();
    return undefined;
  }

  shuffle() {
    if (!this.canPlace) return;
    this.fleet.shuffle(this.random);
    this.ctx.sound?.play("tap");
    this.wake();
  }

  async ready() {
    if (!this.canPlace) return;
    this.sealing = true;
    try {
      const move = await this.fleet.ready(storeKey(this.ctx.view?.me ?? ""), globalThis.crypto.getRandomValues(new Uint8Array(SALT_BYTES)));
      if (move) this.ctx.play(move);
    } finally {
      this.sealing = false;
    }
  }

  liveEffects(now) {
    return this.effects.map((effect) => ({ ...effect, ...effectFrame(effect, now - effect.start) })).filter((effect) => !effect.done);
  }

  rows(theirs, mine) {
    const they = 1 - (this.me ?? 0);
    const format = numberIn(this.ctx.lang ?? "en");
    const row = (side, found) => ({ side, found: found.map((ship) => ship.len), count: `${format.format(found.length)}/${format.format(SHIPS.length)}` });
    return [row(they, theirs.found), row(this.me ?? 0, this.myFound(mine))];
  }

  view(now, { still = false, size = NOMINAL } = {}) {
    const time = still ? 0 : now / 1000;
    const me = this.me ?? 0;
    if (this.placing) {
      return { size, time, me, mode: "place", place: { ships: this.fleet?.ships ?? [], controls: this.committed ? null : { enabled: this.canPlace } } };
    }
    const live = still ? [] : this.liveEffects(now);
    const theirs = this.theirs();
    const mine = this.mine();
    const open = this.canFire ? [...openCells(this.ctx.state, this.me)] : [];
    return {
      size,
      time,
      me,
      mode: "fire",
      theirs: { ...theirs, open, pending: this.pendingCell(), chosen: this.canFire ? this.chosen : null, effects: live.filter((effect) => effect.sea === "theirs") },
      mine: { ...mine, effects: live.filter((effect) => effect.sea === "mine") },
      rows: this.rows(theirs, mine),
    };
  }

  hear(now) {
    for (const effect of this.effects) {
      const elapsed = now - effect.start;
      for (const cue of cuesBetween([effect], effect.heard, elapsed)) this.ctx.sound?.play(cue);
      effect.heard = Math.max(effect.heard, elapsed);
    }
  }

  draw(ctx, { size, theme, now, still }) {
    if (!still) this.hear(now);
    const view = this.view(now, { still, size });
    drawBoard(ctx, theme, view);
    this.effects = still ? [] : this.effects.filter((effect) => !effectFrame(effect, now - effect.start).done);
    if (this.effects.length) return 0;
    if (still) return null;
    return view.theirs?.chosen !== null && view.theirs?.chosen !== undefined ? PULSE_MS : null;
  }
}

export const createScene = (context, options) => new Scene(context, options);
