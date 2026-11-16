import { Table } from "../../../kit/src/table.js";
import { SHARED, fillMove } from "./shared.js";

const AWAY = ["notOpen", "unreachable", "busy", "left", "denied"];

export class Duo {
  constructor({ ft, opening, app, onChange = () => {}, timing, random }) {
    const proxy = { ...ft, onOpen: (handler) => handler(opening) };
    this.table = new Table({ ft: proxy, game: SHARED, app, t: (key) => key, timing, random, onChange });
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
      phase: seen?.phase ?? "none",
      myTurn: Boolean(seen?.myTurn && !seen.fork && table.playable),
      state: seen?.state ?? SHARED.initial(),
      index: seen?.index ?? 0,
      solo: table.solo,
      here: table.solo || table.peerHere,
      calling: table.connecting,
      away: AWAY.includes(notice),
      update: notice === "update",
      prompt: table.prompt?.kind ?? null,
    };
  }

  async start() {
    const { table } = this;
    const current = this.record;
    if (!current) await table.newMatch();
    else if (table.record?.id !== current.id) await table.enter(current.id);
    else if (!table.peerHere) await table.retry();
  }

  choose(page) {
    return this.status.myTurn ? this.table.play(page) : Promise.resolve();
  }

  fill(zone, token) {
    return this.status.myTurn ? this.table.play(fillMove(zone, token)) : Promise.resolve();
  }

  again() {
    return this.table.again();
  }

  retry() {
    return this.table.retry();
  }

  accept() {
    return this.table.accept();
  }

  dismiss() {
    this.table.dismiss();
  }

  leave() {
    return this.table.record ? this.table.leave() : Promise.resolve();
  }
}
