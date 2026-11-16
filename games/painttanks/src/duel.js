import { Table } from "../../../kit/src/table.js";
import { battle } from "./rules.js";

const AWAY = ["notOpen", "unreachable", "busy", "left", "denied"];

export class Duel {
  constructor({ ft, opening, app, onChange = () => {}, timing }) {
    const proxy = { ...ft, onOpen: (handler) => handler(opening) };
    this.cache = { key: null, states: [] };
    this.table = new Table({ ft: proxy, game: battle, app, t: (key) => key, timing, onChange });
  }

  ready() {
    return this.table.idle();
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
      phase: seen ? seen.phase : "none",
      here: table.peerHere,
      calling: table.connecting,
      away: AWAY.includes(notice),
      update: notice === "update",
      prompt: table.prompt?.kind ?? null,
    };
  }

  statesOf(id, index, moves) {
    const key = `${id}/${index}`;
    if (this.cache.key !== key || this.cache.states.length > moves.length) this.cache = { key, states: [] };
    let state = this.cache.states.at(-1) ?? battle.initial();
    for (let at = this.cache.states.length; at < moves.length; at += 1) {
      const played = battle.play(state, moves[at], battle.turn(state));
      if (played.error) break;
      state = played.state;
      this.cache.states.push(state);
    }
    return this.cache.states;
  }

  get round() {
    const { table } = this;
    const seen = table.record ? table.view : null;
    if (!seen || !seen.round || !["play", "over"].includes(seen.phase)) return null;
    const { moves } = seen.round;
    return {
      id: table.record.id,
      index: seen.index,
      mySide: seen.mySide,
      myTurn: seen.myTurn,
      needsSetup: moves.length === 0,
      states: this.statesOf(table.record.id, seen.index, moves),
      over: seen.phase === "over",
    };
  }

  async start() {
    const { table } = this;
    const current = this.record;
    if (!current || current.game.end) await table.newMatch();
    else if (table.record?.id !== current.id) await table.enter(current.id);
    else if (!table.peerHere) await table.retry();
    return this.round;
  }

  play(move) {
    return this.table.play(move);
  }

  again() {
    return this.table.again();
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
