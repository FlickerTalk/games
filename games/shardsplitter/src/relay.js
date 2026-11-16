import { view } from "../../../kit/src/match.js";
import { Table } from "../../../kit/src/table.js";
import { TEAM_RULES } from "./team-rules.js";

const AWAY = ["notOpen", "unreachable", "busy", "left", "denied"];
const ON = ["play", "over"];

export class Relay {
  constructor({ ft, opening, app, onChange = () => {}, timing }) {
    this.onChange = onChange;
    const proxy = { ...ft, onOpen: (handler) => handler(opening) };
    this.table = new Table({ ft: proxy, game: TEAM_RULES, app, t: (key) => key, timing, onChange: () => this.onChange() });
  }

  ready() {
    return this.table.idle();
  }

  get record() {
    const { table } = this;
    return table.record ?? table.matches.find(({ record }) => !record.game.end)?.record ?? null;
  }

  get seen() {
    const record = this.record;
    return record ? view(record, TEAM_RULES) : null;
  }

  get status() {
    const notice = this.table.notice?.key ?? null;
    return { here: this.table.peerHere, calling: this.table.connecting, away: AWAY.includes(notice), update: notice === "update", prompt: this.table.prompt?.kind ?? null };
  }

  duty() {
    const seen = this.seen;
    if (!seen || ["ended", "broken"].includes(seen.phase)) return "start";
    if (!ON.includes(seen.phase)) return "wait";
    if (seen.phase === "over") return seen.round.starter === seen.me ? "wait" : "setup";
    if (seen.state.round) return "play";
    return seen.myTurn ? "setup" : "wait";
  }

  round() {
    const seen = this.seen;
    return seen && ON.includes(seen.phase) ? seen.state.round : null;
  }

  roundId() {
    const seen = this.seen;
    return seen?.state.round ? `${this.record.id}/${seen.index}` : null;
  }

  moves() {
    return this.seen?.round?.moves.slice(1) ?? [];
  }

  mySide() {
    return this.seen?.mySide ?? 0;
  }

  myTurn() {
    return this.seen?.myTurn === true;
  }

  async start() {
    const { table } = this;
    const current = this.record;
    if (!current || current.game.end) await table.newMatch();
    else if (table.record?.id !== current.id) await table.enter(current.id);
    else if (!table.peerHere) await table.retry();
  }

  async sendSetup(code) {
    await this.start();
    if (this.seen?.phase === "over") await this.table.again();
    await this.table.play(code);
  }

  hit(divisor) {
    return this.table.play(divisor);
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
