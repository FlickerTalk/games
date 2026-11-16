import { view } from "../../../kit/src/match.js";
import { Table } from "../../../kit/src/table.js";
import { DUEL_RULES } from "./duel-rules.js";
import { decodeLevel } from "./level.js";
import { decodeProgram } from "./program.js";

const AWAY = ["notOpen", "unreachable", "busy", "left", "denied"];

export class Relay {
  constructor({ ft, opening, app, onChange = () => {}, timing }) {
    this.store = ft.store;
    this.key = `duel/${opening.chat}`;
    this.watched = { match: null, round: -1 };
    this.onChange = onChange;
    const proxy = { ...ft, onOpen: (handler) => handler(opening) };
    this.table = new Table({ ft: proxy, game: DUEL_RULES, app, t: (key) => key, timing, onChange: () => this.onChange() });
  }

  async ready() {
    await this.table.idle();
    try {
      const kept = JSON.parse((await this.store?.get(this.key)) ?? "null");
      if (typeof kept?.match === "string" && Number.isInteger(kept.round)) this.watched = { match: kept.match, round: kept.round };
    } catch {
      this.watched = { match: null, round: -1 };
    }
  }

  get record() {
    const { table } = this;
    return table.record ?? table.matches.find(({ record }) => !record.game.end)?.record ?? null;
  }

  get seen() {
    const record = this.record;
    return record ? view(record, DUEL_RULES) : null;
  }

  get status() {
    const notice = this.table.notice?.key ?? null;
    return { here: this.table.peerHere, calling: this.table.connecting, away: AWAY.includes(notice), update: notice === "update", prompt: this.table.prompt?.kind ?? null };
  }

  duty() {
    const seen = this.seen;
    if (!seen || ["ended", "broken"].includes(seen.phase)) return "start";
    if (seen.phase !== "play" && seen.phase !== "over") return "wait";
    if (seen.phase === "play") {
      if (!seen.myTurn) return "wait";
      return seen.state.level === null ? "build" : "solve";
    }
    const built = seen.round.starter === seen.me;
    if (!built) return "build";
    const watched = this.watched.match === this.record.id && this.watched.round >= seen.index;
    return watched ? "wait" : "watch";
  }

  level() {
    const code = this.seen?.state.level;
    return code ? decodeLevel(code) : null;
  }

  solution() {
    const code = this.seen?.state.program;
    return code ? decodeProgram(code) : null;
  }

  async start() {
    const { table } = this;
    const current = this.record;
    if (!current || current.game.end) await table.newMatch();
    else if (table.record?.id !== current.id) await table.enter(current.id);
    else if (!table.peerHere) await table.retry();
  }

  async sendLevel(code) {
    await this.start();
    if (this.seen?.phase === "over") await this.table.again();
    await this.table.play(code);
  }

  sendProgram(code) {
    return this.table.play(code);
  }

  async markWatched() {
    this.watched = { match: this.record?.id ?? null, round: this.seen?.index ?? -1 };
    try {
      await this.store?.set(this.key, JSON.stringify(this.watched));
    } catch {
      return false;
    }
    return true;
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
