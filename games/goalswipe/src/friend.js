import { Table } from "../../../kit/src/table.js";
import { aimText, readAim } from "./kicks.js";
import { RULES, SALT_BYTES, commitMove, diveMove, revealMove } from "./rules.js";
import { fromBase64url, toBase64url } from "./sha256.js";

const AWAY = ["notOpen", "unreachable", "busy", "left", "denied"];
const LIVE = ["play", "over"];

function freshSalt() {
  const salt = new Uint8Array(SALT_BYTES);
  globalThis.crypto.getRandomValues(salt);
  return salt;
}

export class Friend {
  constructor({ ft, opening, app, onChange = () => {}, timing }) {
    this.store = ft.store;
    this.key = `kick/${opening.chat}`;
    this.secret = null;
    this.wanted = false;
    const proxy = { ...ft, onOpen: (handler) => handler(opening) };
    this.table = new Table({ ft: proxy, game: RULES, app, t: (key) => key, timing, onChange });
  }

  ready() {
    return this.table.idle();
  }

  get record() {
    const { table } = this;
    return table.record ?? table.matches.find(({ record }) => !record.game.end)?.record ?? null;
  }

  get seen() {
    return this.table.record ? this.table.view : null;
  }

  get status() {
    const { table } = this;
    const notice = table.notice?.key ?? null;
    const phase = this.seen?.phase;
    const playing = LIVE.includes(phase);
    return {
      here: table.peerHere,
      calling: table.connecting,
      away: AWAY.includes(notice),
      update: notice === "update",
      prompt: table.prompt?.kind ?? null,
      playing,
      waiting: this.wanted && !playing,
      invited: phase === "play" && !this.wanted,
    };
  }

  get won() {
    const seen = this.seen;
    if (seen?.phase !== "over") return null;
    return seen.result.winner === null ? null : seen.result.winner === seen.me;
  }

  async start() {
    const { table } = this;
    const current = this.record;
    this.wanted = true;
    if (!current || current.game.end) await table.newMatch();
    else if (table.record?.id !== current.id) await table.enter(current.id);
    else if (!table.peerHere) await table.retry();
  }

  mine(phase) {
    const seen = this.seen;
    return seen?.phase === "play" && seen.myTurn && seen.state.phase === phase ? seen : null;
  }

  async shoot(aim) {
    const seen = this.mine("commit");
    if (!seen) return false;
    const salt = freshSalt();
    this.secret = { match: this.table.record.id, round: seen.index, kick: seen.state.kicks.length, salt: toBase64url(salt), aim: aimText(aim) };
    await this.store?.set(this.key, JSON.stringify(this.secret));
    await this.table.play(commitMove(this.secret.kick, salt, aim));
    return true;
  }

  async dive(point) {
    if (!this.mine("dive")) return false;
    await this.table.play(diveMove(point));
    return true;
  }

  async kept() {
    if (this.secret) return this.secret;
    try {
      return JSON.parse((await this.store?.get(this.key)) ?? "null");
    } catch {
      return null;
    }
  }

  async reveal() {
    const seen = this.mine("reveal");
    if (!seen) return false;
    const secret = await this.kept();
    const salt = fromBase64url(secret?.salt);
    const aim = readAim(secret?.aim);
    const same = secret?.match === this.table.record.id && secret.round === seen.index && secret.kick === seen.state.kicks.length;
    if (!same || !salt || !aim) return false;
    await this.table.play(revealMove(salt, aim));
    return true;
  }

  async again() {
    if (this.seen?.phase !== "over") return false;
    await this.table.again();
    return true;
  }

  accept() {
    this.wanted = true;
    return this.table.accept();
  }

  dismiss() {
    this.table.dismiss();
  }

  retry() {
    return this.table.retry();
  }

  leave() {
    this.wanted = false;
    return this.table.record ? this.table.leave() : Promise.resolve();
  }
}
