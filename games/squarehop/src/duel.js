import { view } from "../../../kit/src/match.js";
import { Table } from "../../../kit/src/table.js";
import { DUEL_RULES, SEED_BYTES, commitText, keyOf, revealText, seedText } from "./duel-rules.js";
import { fromBase64url, toBase64url } from "./sha256.js";

const AWAY = ["notOpen", "unreachable", "busy", "left", "denied"];
const OPENING = 3;
const PICKS = ["0", "1"];

const freshSeed = () => globalThis.crypto.getRandomValues(new Uint8Array(SEED_BYTES));

export class Duel {
  constructor({ ft, opening, app, onChange = () => {}, timing, fresh = freshSeed }) {
    this.store = ft.store;
    this.key = `seed/${opening.chat}`;
    this.fresh = fresh;
    this.active = false;
    this.stepping = false;
    this.onChange = onChange;
    const proxy = { ...ft, onOpen: (handler) => handler(opening) };
    this.table = new Table({ ft: proxy, game: DUEL_RULES, app, t: (key) => key, timing, onChange: () => this.changed() });
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
    return record ? view(record, DUEL_RULES) : null;
  }

  get status() {
    const notice = this.table.notice?.key ?? null;
    const seen = this.seen;
    const invited = !this.active && Boolean(seen) && seen.phase === "play";
    return { here: this.table.peerHere, calling: this.table.connecting, away: AWAY.includes(notice), update: notice === "update", prompt: this.table.prompt?.kind ?? null, invited };
  }

  duty() {
    const seen = this.seen;
    if (!seen || ["ended", "broken"].includes(seen.phase)) return "start";
    if (seen.phase === "over") return "over";
    if (seen.phase !== "play") return "wait";
    if (seen.state.key === null) return "open";
    return seen.myTurn ? "pick" : "wait";
  }

  get round() {
    const seen = this.seen;
    if (!seen || !seen.round || !["play", "over"].includes(seen.phase)) return null;
    const { state } = seen;
    const picks = seen.round.moves.slice(OPENING).filter((move) => PICKS.includes(move)).map(Number);
    return { id: `${this.record.id}/${seen.index}`, index: seen.index, me: seen.mySide, key: keyOf(state), picks, void: seen.phase === "over" && state.race.winner === null };
  }

  async start() {
    this.active = true;
    const { table } = this;
    const current = this.record;
    if (!current || current.game.end) await table.newMatch();
    else if (table.record?.id !== current.id) await table.enter(current.id);
    else if (!table.peerHere) await table.retry();
    if (table.view?.phase === "over") await table.again();
    await this.step();
  }

  async kept() {
    try {
      const kept = JSON.parse((await this.store?.get(this.key)) ?? "null");
      return typeof kept?.tag === "string" && typeof kept.seed === "string" ? kept : null;
    } catch {
      return null;
    }
  }

  async opening(seen) {
    const { commit, seed } = seen.state;
    const tag = `${this.table.record.id}/${seen.index}`;
    if (commit === null) {
      const secret = this.fresh();
      await this.store?.set(this.key, JSON.stringify({ tag, seed: toBase64url(secret) }));
      return commitText(secret);
    }
    if (seed === null) return seedText(this.fresh());
    const kept = await this.kept();
    const secret = kept?.tag === tag ? fromBase64url(kept.seed) : null;
    return secret ? revealText(secret) : null;
  }

  async step() {
    if (!this.active || this.stepping || !this.table.record) return;
    this.stepping = true;
    try {
      for (let tries = 0; tries < OPENING; tries += 1) {
        const seen = this.table.view;
        if (seen.phase !== "play" || !seen.myTurn || seen.state.key !== null) break;
        const before = this.table.record;
        const move = await this.opening(seen);
        if (move) await this.table.play(move);
        else await this.table.resign();
        if (this.table.record === before) break;
      }
    } catch (error) {
      globalThis.console?.warn?.("square hop rally:", error?.message ?? error);
    } finally {
      this.stepping = false;
    }
  }

  changed() {
    this.step().finally(() => this.onChange());
  }

  pick(index) {
    return this.table.play(PICKS[index]);
  }

  accept() {
    this.active = true;
    return this.table.accept();
  }

  dismiss() {
    this.table.dismiss();
  }

  retry() {
    return this.table.retry();
  }

  leave() {
    this.active = false;
    return this.table.record ? this.table.leave() : Promise.resolve();
  }
}
