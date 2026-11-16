import { Table } from "../table.js";
import { seedOf } from "./random.js";

const AWAY = ["notOpen", "unreachable", "busy", "left", "denied"];

export function sameRoundRules({ id, gv, read }) {
  const initial = () => ({ seed: null, results: [null, null] });
  const turn = (state) => (state.results[0] === null ? 0 : 1);
  const result = (state) => {
    const [one, two] = state.results;
    if (!one || !two) return null;
    return { winner: one.score === two.score ? null : one.score > two.score ? 0 : 1 };
  };
  const play = (state, move, side) => {
    if (result(state)) return { error: "over" };
    if (side !== turn(state)) return { error: "turn" };
    const round = read(move);
    if (!round) return { error: "bad" };
    if (round.error) return { error: round.error };
    if (state.seed !== null && round.seed !== state.seed) return { error: "seed" };
    const { seed, ...scored } = round;
    const results = [...state.results];
    results[side] = scored;
    return { state: { seed, results } };
  };
  return Object.freeze({ id, gv, initial, turn, play, result, read });
}

export class SameRounds {
  constructor({ ft, opening, app, rules, onChange = () => {}, timing }) {
    this.store = ft.store;
    this.rules = rules;
    this.key = `duel/${opening.chat}`;
    this.local = { match: null, reports: {} };
    this.onChange = onChange;
    this.flushing = false;
    const proxy = { ...ft, onOpen: (handler) => handler(opening) };
    this.table = new Table({ ft: proxy, game: rules, app, t: (key) => key, timing, onChange: () => this.changed() });
  }

  async ready() {
    await this.table.idle();
    try {
      const kept = JSON.parse((await this.store?.get(this.key)) ?? "null");
      if (kept && typeof kept.match === "string" && kept.reports && typeof kept.reports === "object") this.local = { match: kept.match, reports: { ...kept.reports } };
    } catch {
      this.local = { match: null, reports: {} };
    }
  }

  get record() {
    const { table } = this;
    return table.record ?? table.matches.find(({ record }) => !record.game.end)?.record ?? null;
  }

  get status() {
    const { table } = this;
    const seen = table.record ? table.view : null;
    const notice = table.notice?.key ?? null;
    return {
      phase: seen ? (seen.phase === "over" ? "play" : seen.phase) : "none",
      here: table.peerHere,
      calling: table.connecting,
      away: AWAY.includes(notice),
      update: notice === "update",
      prompt: table.prompt?.kind ?? null,
    };
  }

  async save() {
    try {
      await this.store?.set(this.key, JSON.stringify(this.local));
    } catch {
      return false;
    }
    return true;
  }

  mine(seen) {
    const done = [];
    seen.rounds.forEach((round, index) => {
      const side = round.starter === seen.me ? 0 : 1;
      if (round.state.results[side]) done.push(index);
    });
    return done;
  }

  nextIndex() {
    const committed = this.table.record ? this.mine(this.table.view) : [];
    const kept = Object.keys(this.local.reports).map(Number);
    return Math.max(-1, ...committed, ...kept) + 1;
  }

  async start() {
    const { table } = this;
    const current = this.record;
    if (!current || current.game.end) await table.newMatch();
    else if (table.record?.id !== current.id) await table.enter(current.id);
    else if (!table.peerHere) await table.retry();
    await this.adopt();
    const index = this.nextIndex();
    return { index, seed: seedOf(`${table.record.id}/${index}`) };
  }

  async adopt() {
    const id = this.table.record?.id ?? null;
    if (id && this.local.match !== id) {
      this.local = { match: id, reports: {} };
      await this.save();
    }
  }

  async finish(index, move) {
    await this.adopt();
    this.local.reports[index] = move;
    await this.save();
    await this.flush();
  }

  changed() {
    this.flush().finally(() => this.onChange());
  }

  async flush() {
    if (this.flushing || !this.table.record) return;
    this.flushing = true;
    try {
      await this.adopt();
      for (let step = 0; step < 4 && (await this.step()); step += 1);
    } finally {
      this.flushing = false;
    }
  }

  async step() {
    const seen = this.table.view;
    for (const index of this.mine(seen)) delete this.local.reports[index];
    const waiting = this.local.reports;
    const before = this.table.record;
    if (seen.phase === "over" && waiting[seen.index + 1] !== undefined) await this.table.again();
    else if (seen.phase === "play" && seen.myTurn && waiting[seen.index] !== undefined) await this.table.play(waiting[seen.index]);
    return this.table.record !== before;
  }

  scoreOf(move) {
    const round = move ? this.rules.read(move) : null;
    if (!round || round.error) return null;
    const { seed, ...scored } = round;
    return scored;
  }

  results(index) {
    const seen = this.table.record ? this.table.view : null;
    const round = seen?.rounds[index];
    const side = round ? (round.starter === seen.me ? 0 : 1) : 0;
    const mine = round?.state.results[side] ?? this.scoreOf(this.local.reports[index]);
    const theirs = round?.state.results[1 - side] ?? null;
    let winner = null;
    if (mine && theirs) winner = mine.score === theirs.score ? "draw" : mine.score > theirs.score ? "me" : "them";
    return { mine, theirs, winner };
  }

  accept() {
    return this.table.accept();
  }

  dismiss() {
    this.table.dismiss();
  }

  retry() {
    return this.table.retry();
  }

  leave() {
    return this.table.record ? this.table.leave() : Promise.resolve();
  }
}
