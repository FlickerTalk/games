// The table: this phone's side of a game, between the user, the matches kept here and the twin on
// the other phone (README, "Protocol"). It talks only when the user starts or enters a match —
// never just because the plugin opened, since a message without a connection wakes the other
// phone — and it says plainly what it cannot know: `live.send` answering true is not "heard".

import { whoProof } from "./commit.js";
import { KV, PROTOCOL, isId, seal, unseal } from "./envelope.js";
import { MATCH_LIMIT, chooseFork, merge, newId, newMatch, peerOf, replay, tossStep, view } from "./match.js";
import { exists, forget, isChat, list, load, save } from "./store.js";

export { MATCH_LIMIT };

/** How long to wait for an answer, for the coin's reveal, and between hellos nobody answered. */
export const TIMING = { ack: 8_000, reveal: 30_000, retry: 15_000, retries: 8 };
/** The kinds that the other side answers. */
const ASKING = ["hello", "state", "commit", "seed", "reveal"];
/** What the other side's voice proves wrong. */
const ABSENCE = ["notOpen", "unreachable", "busy", "left", "denied"];

/**
 * What goes to the chat when the user sends the result: in the sender's words and language,
 * the last round's outcome and the series score, numbers through Intl.
 */
export function summarize(view, { t, icon, name, lang }) {
  const number = new Intl.NumberFormat(lang);
  const winner = view.result?.winner;
  const result = winner === null || winner === undefined ? "sayDraw" : winner === view.me ? "sayIWon" : "sayYouWon";
  const score = `${number.format(view.score.me)}–${number.format(view.score.them)}`;
  let text = `${icon} ${t("say", { game: name, result: t(result), score })}`;
  if (view.score.draws) text += ` · ${t("sayDraws", { n: number.format(view.score.draws) })}`;
  return text;
}

export class Table {
  /**
   * `ft` is the frame's Plugin API; `game` the rules (README, "A game"); `t(key, vars)` the
   * texts in the user's language; `onChange` is told after every change, for the view.
   */
  constructor({ ft, game, app, t, timing = {}, random, onChange = () => {} }) {
    this.ft = ft;
    this.game = game;
    this.app = app;
    this.t = t;
    this.timing = { ...TIMING, ...timing };
    this.random = random;
    this.onChange = onChange;
    this.screen = "list";
    this.matches = [];
    this.record = null;
    this.live = false;
    this.chat = null;
    this.lang = "en";
    this.dark = false;
    this.notice = null;
    this.prompt = null;
    this.peerHere = false;
    this.connecting = false;
    this.timers = { ack: null, reveal: null, retry: null };
    this.retries = 0;
    this.lastSendOk = false;
    // What this frame (one conversation) has learnt of each match's other phone: the nonce this
    // side chose, the other's nonce and the proof for it, and whether the other proved it holds
    // the expected participant (README, "First contact").
    this.sessions = new Map();
    this.queue = Promise.resolve();
    ft.onOpen((opening) => this.run(() => this.opened(opening)));
    ft.live?.onMessage?.((data) => this.run(() => this.heard(data)));
  }

  /** The current match, worked out for the screens; null on the list. */
  get view() {
    return this.record ? view(this.record, this.game) : null;
  }

  /** One thing at a time: what the user does and what arrives never interleave. */
  run(task) {
    const next = this.queue.then(task).catch((error) => {
      this.notice = { key: "error" };
      globalThis.console?.warn?.("game:", error?.message ?? error);
    });
    this.queue = next.finally(() => this.onChange());
    return this.queue;
  }

  idle() {
    return this.queue;
  }

  // ---- What the user does ----

  newMatch() {
    return this.run(async () => {
      if (!this.live) {
        this.notice = { key: "needsChat" };
        return;
      }
      const record = newMatch({ g: this.game.id, gv: this.game.gv });
      if (!(await save(this.ft.records, this.chat, record))) {
        this.notice = { key: "full" };
        return;
      }
      this.show(record);
      this.say("hello");
    });
  }

  enter(id) {
    return this.run(async () => {
      const record = this.chat ? await load(this.ft.records, this.chat, id) : null;
      if (!record) return this.reload();
      this.show(record);
      if (this.live) this.say("hello");
    });
  }

  leave() {
    return this.run(async () => {
      if (this.record && this.live && this.peerHere) this.say("bye", { game: false });
      this.stopTimers();
      this.record = null;
      this.screen = "list";
      this.notice = null;
      this.peerHere = false;
      this.connecting = false;
      await this.reload();
    });
  }

  play(move) {
    return this.run(async () => {
      const seen = this.view;
      if (!seen || seen.phase !== "play" || !seen.myTurn || seen.fork || !this.live) return;
      await this.commit(this.with(move), "state");
    });
  }

  resign() {
    return this.run(async () => {
      const seen = this.view;
      if (!seen || seen.phase !== "play" || seen.fork || !this.live) return;
      await this.commit(this.with({ x: "resign", by: this.record.me }), "state");
    });
  }

  again() {
    return this.run(async () => {
      const seen = this.view;
      if (!seen || seen.phase !== "over" || !this.live) return;
      await this.commit(this.with({ x: "next" }), "state");
    });
  }

  pickFork(which) {
    return this.run(async () => {
      if (!this.record?.fork) return;
      await this.commit(chooseFork(this.record, which), "state");
    });
  }

  remove(id) {
    return this.run(async () => {
      if (!this.chat) return;
      await forget(this.ft.records, this.chat, id);
      if (this.record?.id === id) {
        this.stopTimers();
        this.record = null;
        this.screen = "list";
      }
      await this.reload();
    });
  }

  retry() {
    return this.run(() => {
      if (!this.record || !this.live) return;
      this.retries = 0;
      this.say("hello");
    });
  }

  /** Joins the match the other person opened, or goes to the one they are in. */
  accept() {
    return this.run(async () => {
      const prompt = this.prompt;
      this.prompt = null;
      if (!prompt) return;
      if (this.record && this.peerHere) this.say("bye", { game: false });
      if (prompt.kind === "invited") {
        const { message } = prompt;
        const joined = await merge(null, message.game, this.game, { me: newId(), from: message.who, g: this.game.id, gv: this.game.gv, id: message.doc });
        if (joined.verdict !== "took") return;
        if (!(await save(this.ft.records, this.chat, joined.record))) {
          this.notice = { key: "full" };
          return;
        }
        this.show(joined.record);
        // The inviter introduced itself; the first answer introduces the one who joins.
        this.session(message.doc).proven = true;
        this.say("sync");
        return;
      }
      const record = await load(this.ft.records, this.chat, prompt.id);
      if (!record) return;
      this.show(record);
      this.say("hello");
    });
  }

  dismiss() {
    this.prompt = null;
    this.onChange();
  }

  /** The result to the chat, in the composer: `ft.say` closes the plugin, and all is saved. */
  sendResult() {
    const seen = this.view;
    if (!seen) return;
    const name = this.t("name");
    const icon = this.game.icon ?? "🎲";
    const text = this.game.summary?.(seen, { t: this.t, lang: this.lang, name, icon, record: this.record }) ?? summarize(seen, { t: this.t, icon, name, lang: this.lang });
    this.ft.say(text);
  }

  // ---- Inside ----

  async opened(opening) {
    this.lang = opening.lang || "en";
    // A match belongs to the conversation the game is open in; without one, there is none to
    // show, start or play, and no shared place to fall back on.
    this.chat = isChat(opening.chat) ? opening.chat : null;
    this.live = Boolean(opening.live) && this.chat !== null;
    this.dark = Boolean(opening.dark);
    if (!this.record) await this.reload();
  }

  async reload() {
    if (!this.chat) {
      this.matches = [];
      return;
    }
    const kept = await list(this.ft.records, this.chat, this.game.id);
    this.matches = kept.map((record) => ({ record, view: view(record, this.game) }));
  }

  show(record) {
    this.stopTimers();
    this.record = record;
    this.screen = "match";
    this.notice = null;
    this.peerHere = false;
    this.connecting = false;
    this.retries = 0;
  }

  /** The current match with one more event. */
  with(event) {
    const next = structuredClone(this.record);
    next.game.moves.push(event);
    next.updated = Date.now();
    return next;
  }

  /** Keeps a change and tells the other side; nothing of it happens if it cannot be kept. */
  async commit(next, kind) {
    if (!replay(next.game, this.game).ok) return false;
    const weight = new TextEncoder().encode(JSON.stringify(this.envelope(kind, next, true))).length;
    if (weight > MATCH_LIMIT) {
      this.notice = { key: "tooLong" };
      return false;
    }
    if (!(await save(this.ft.records, this.chat, next))) {
      this.notice = { key: "full" };
      return false;
    }
    this.record = next;
    if (this.notice?.key === "fork" || this.notice?.key === "badMove") this.notice = null;
    this.say(kind);
    return true;
  }

  envelope(kind, record, withGame) {
    const message = { p: PROTOCOL, kv: KV, g: this.game.id, gv: this.game.gv, k: kind, doc: record.id, who: record.me, app: this.app };
    if (withGame) message.game = record.game;
    return message;
  }

  /** What this frame knows of a match's other phone (created on first use). */
  session(doc) {
    let one = this.sessions.get(doc);
    if (!one) {
      // `stand` answers for a match that is not here, or has nobody else in it, so that the
      // answer looks like any other.
      one = { nonce: newId(), stand: newId(), peerNonce: null, proof: null, proven: false, invited: false };
      this.sessions.set(doc, one);
    }
    return one;
  }

  /**
   * Says something about the current match. Before the other phone has proved, in this
   * conversation, that it holds the match's other participant, nothing about the match leaves:
   * a `hello` carries only the match id and this frame's nonce. An invitation (nobody in the other
   * seat yet) carries the new match. The answer, or its absence, comes later.
   */
  say(kind, { game = true } = {}) {
    const record = this.record;
    const session = this.session(record.id);
    const inviting = !record.game.b;
    let message;
    if (kind === "hello" && !inviting) {
      message = this.envelope(kind, record, false);
      message.who = session.nonce;
    } else if (kind === "hello" || kind === "bye") {
      message = this.envelope(kind, record, kind === "hello");
      session.invited ||= kind === "hello";
    } else {
      if (!game || !(session.proven || inviting)) return;
      message = this.envelope(kind, record, true);
      if (session.proof) message.proof = session.proof;
    }
    let data;
    try {
      data = seal(message);
    } catch {
      this.notice = { key: "tooLong" };
      return;
    }
    if (kind === "hello" && !this.peerHere) this.connecting = true;
    Promise.resolve(this.ft.live.send(data)).then(
      (ok) => this.run(() => this.sent(kind, record.id, ok)),
      () => this.run(() => this.sent(kind, record.id, false)),
    );
  }

  /** Answers without saying anything about a match: `who` is a throwaway, or a nonce. */
  answer(kind, doc, who = newId(), extra = {}) {
    const message = { p: PROTOCOL, kv: KV, g: this.game.id, gv: this.game.gv, k: kind, doc, who, app: this.app, ...extra };
    this.ft.live.send(seal(message));
  }

  sent(kind, id, ok) {
    if (this.record?.id !== id) return;
    if (!ok) {
      this.lastSendOk = false;
      this.peerHere = false;
      this.connecting = false;
      this.stop("retry");
      if (kind !== "bye") this.notice = { key: "unreachable" };
      return;
    }
    this.lastSendOk = true;
    if (ASKING.includes(kind)) {
      this.stop("ack");
      this.timers.ack = setTimeout(() => this.run(() => this.unanswered(id)), this.timing.ack);
    }
  }

  unanswered(id) {
    this.timers.ack = null;
    if (this.record?.id !== id) return;
    this.peerHere = false;
    this.connecting = false;
    this.notice = { key: "notOpen" };
    // While the user waits here, say hello again now and then, but only over a channel that took
    // the last message: a hello without a connection would wake the other phone.
    if (this.lastSendOk && this.retries < this.timing.retries && !this.timers.retry) {
      this.timers.retry = setTimeout(
        () =>
          this.run(() => {
            this.timers.retry = null;
            if (this.record?.id !== id || this.peerHere) return;
            this.retries += 1;
            this.say("hello");
          }),
        this.timing.retry,
      );
    }
  }

  stop(name) {
    clearTimeout(this.timers[name]);
    this.timers[name] = null;
  }

  stopTimers() {
    for (const name of Object.keys(this.timers)) this.stop(name);
  }

  /** The other participant spoke: they are here, and what said they were not is no longer true. */
  present() {
    this.stop("ack");
    this.stop("retry");
    this.retries = 0;
    this.peerHere = true;
    this.connecting = false;
    if (ABSENCE.includes(this.notice?.key)) this.notice = null;
  }

  async heard(data) {
    const opened = this.chat ? unseal(data, { g: this.game.id, gv: this.game.gv }) : null;
    if (!opened) return;
    if (opened.newer) {
      this.notice = { key: "update", vars: { version: opened.newer.app } };
      return;
    }
    const message = opened.message;
    const current = this.record?.id === message.doc ? this.record : null;
    if (message.k === "busy" || message.k === "deny") {
      // A phone without the match answers with no seat in it: for the match on screen, it only
      // tells the user what happened there.
      if (!current) return;
      this.absent(message.k === "busy" ? "busy" : "denied");
      return;
    }
    if (message.k === "bye") {
      if (!current || !this.session(message.doc).proven || message.who !== peerOf(current)) return;
      this.stop("ack");
      this.peerHere = false;
      this.notice = { key: "left" };
      return;
    }
    if (message.k === "hello" && !("game" in message)) return this.greeted(message, current);
    if (message.k === "hello") return this.invited(message, current);
    return this.told(message, current);
  }

  /** The other phone is not there for this match, for the reason given. */
  absent(key) {
    this.stop("ack");
    this.stop("retry");
    this.peerHere = false;
    this.connecting = false;
    this.notice = { key };
  }

  /** The match kept under an id, as this kit reads it (null: none, or one it cannot read). */
  async kept(doc, current) {
    return current ?? (await load(this.ft.records, this.chat, doc));
  }

  /**
   * A `hello` without a game: the other phone entered a match and asks this one to prove it holds
   * the participant it expects. Answered with this frame's nonce and the proof — or, for a match
   * that is not here (or has nobody else in it), with a proof of nothing, which looks the same.
   * A `hello` that brings a proof answers this frame's own `hello`.
   */
  async greeted(message, current) {
    const session = this.session(message.doc);
    const record = await this.kept(message.doc, current);
    const peer = record ? peerOf(record) : null;
    if (message.proof !== undefined) {
      const proven = peer && typeof message.proof === "string" && message.proof === (await whoProof(message.doc, session.nonce, record.me));
      if (!proven) {
        if (current) this.absent("denied");
        return;
      }
      session.peerNonce = message.who;
      session.proof = await whoProof(message.doc, message.who, peer);
      session.proven = true;
      if (!current) return;
      this.present();
      this.say("sync");
      return;
    }
    if (peer) {
      session.peerNonce = message.who;
      session.proof = await whoProof(message.doc, message.who, peer);
    }
    const proof = peer ? session.proof : await whoProof(message.doc, message.who, session.stand);
    this.answer("hello", message.doc, session.nonce, { proof });
  }

  /** A `hello` with a game: an invitation to a new match, or nothing this phone answers. */
  async invited(message, current) {
    const game = message.game;
    const invitation = game && typeof game === "object" && !Array.isArray(game) && game.a === message.who && (game.b === null || game.b === undefined);
    if (!invitation) return this.answer("deny", message.doc);
    const session = this.session(message.doc);
    const record = await this.kept(message.doc, current);
    if (record || (await exists(this.ft.records, this.chat, message.doc))) {
      // A match kept here is never joined again. Only the inviter already trusted in this
      // conversation may say it again (the first answer was lost): it gets the answer again.
      if (record && session.proven && peerOf(record) === message.who && current) return this.take(current, message);
      return this.answer("deny", message.doc);
    }
    if (this.screen === "match") {
      this.prompt = { kind: "invited", id: message.doc, message };
      return this.answer("busy", message.doc);
    }
    const joined = await merge(null, game, this.game, { me: newId(), from: message.who, g: this.game.id, gv: this.game.gv, id: message.doc });
    if (joined.verdict !== "took") return this.answer("deny", message.doc);
    if (!(await save(this.ft.records, this.chat, joined.record))) {
      this.notice = { key: "full" };
      return;
    }
    this.show(joined.record);
    session.proven = true;
    return this.take(joined.record, message);
  }

  /**
   * A message with the game (`sync`, `state`, the coin). Taken only from the phone that proved,
   * in this conversation, that it holds the other participant — the proof travels with the first
   * such message — or, for this phone's own invitation, from the one who joins it. Anything else
   * gets no answer, exactly as for a match that is not here.
   */
  async told(message, current) {
    const session = this.session(message.doc);
    const record = await this.kept(message.doc, current);
    if (!record) return;
    let proven = false;
    if (!session.proven) {
      if (!record.game.b) {
        const game = message.game;
        if (!session.invited || !isId(message.who) || message.who === record.me || game?.a !== record.me || game?.b !== message.who) return;
      } else {
        const proof = message.who === peerOf(record) && typeof message.proof === "string" && message.proof === (await whoProof(message.doc, session.nonce, record.me));
        if (!proof) return;
      }
      session.proven = proven = true;
    }
    if (record.game.b && message.who !== peerOf(record)) return;
    if (current) return this.take(current, message, proven);
    if (this.screen !== "match") {
      this.show(record);
      return this.take(record, message, proven);
    }
    // Busy with another match: take what it says, quietly, and let the user choose.
    const quiet = await merge(record, message.game, this.game, { from: message.who });
    if (quiet.verdict !== "bad" && quiet.verdict !== "stranger") await save(this.ft.records, this.chat, quiet.record);
    this.prompt = { kind: "elsewhere", id: message.doc };
    return this.answer("busy", message.doc, record.me);
  }

  /** A message about the match on screen, from its other participant. */
  async take(record, message, proven = false) {
    const result = await merge(record, message.game, this.game, { from: message.who });
    if (result.verdict === "stranger") return;
    this.present();
    if (result.verdict === "bad") {
      this.notice = { key: "badMove" };
      this.say("sync");
      return;
    }
    if (result.verdict === "fork") this.notice = { key: "fork" };
    let next = result.record;
    if (JSON.stringify(next) !== JSON.stringify(record) && !(await save(this.ft.records, this.chat, next))) {
      this.notice = { key: "full" };
      return;
    }
    this.record = next;
    const step = await tossStep(next, this.random ? { random: this.random } : {});
    if (step.send) {
      if (!(await save(this.ft.records, this.chat, step.record))) {
        this.notice = { key: "full" };
        return;
      }
      this.record = next = step.record;
      this.say(step.send);
    } else if (ASKING.includes(message.k) || result.changed || result.verdict === "ahead" || proven || (result.verdict === "fork" && JSON.stringify(record.fork) !== JSON.stringify(next.fork))) {
      // An answer to a question, news, a copy that lacks some of mine, the first word from a phone
      // that just proved itself, or a new parting of ways: say what I have.
      this.say("sync");
    }
    this.watchReveal();
  }

  /** The other side of the coin waits 30 s for the reveal; after that, the match is abandoned. */
  watchReveal() {
    const { game, me, id } = this.record;
    const waiting = me === game.b && game.toss.c && game.toss.s && !game.toss.r && !game.end;
    if (!waiting) return this.stop("reveal");
    if (this.timers.reveal) return;
    this.timers.reveal = setTimeout(() => this.run(() => this.late(id)), this.timing.reveal);
  }

  async late(id) {
    this.timers.reveal = null;
    const record = this.record;
    if (record?.id !== id || record.game.toss.r || record.game.end) return;
    const next = structuredClone(record);
    next.game.end = { k: "abandoned", by: next.game.a };
    next.updated = Date.now();
    if (!(await save(this.ft.records, this.chat, next))) {
      this.notice = { key: "full" };
      return;
    }
    this.record = next;
    this.notice = { key: "abandoned" };
    // Nobody touched anything: say so only over a channel that took the last message, or this
    // would wake the other phone. Otherwise it goes with the next hello.
    if (this.lastSendOk) this.say("sync");
  }
}
