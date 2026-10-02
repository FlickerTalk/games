// The table: this phone's side of a game, between the user, the matches kept here and the twin on
// the other phone (README, "Protocol"). It talks only when the user starts or enters a match —
// never just because the plugin opened, since a message without a connection wakes the other
// phone — and it says plainly what it cannot know: `live.send` answering true is not "heard".

import { KV, PROTOCOL, seal, unseal } from "./envelope.js";
import { chooseFork, merge, newId, newMatch, peerOf, replay, tossStep, view } from "./match.js";
import { forget, list, load, save } from "./store.js";

/** How long to wait for an answer, for the coin's reveal, and between hellos nobody answered. */
export const TIMING = { ack: 8_000, reveal: 30_000, retry: 15_000, retries: 8 };
/** The most a match may weigh in one message (JSON bytes), with room to spare below the core's
 *  48 KiB: a series that would not fit ends there, so the kit never needs to cut a message. */
export const MATCH_LIMIT = 40_000;
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
    this.lang = "en";
    this.dark = false;
    this.notice = null;
    this.prompt = null;
    this.peerHere = false;
    this.connecting = false;
    this.timers = { ack: null, reveal: null, retry: null };
    this.retries = 0;
    this.lastSendOk = false;
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
      if (!(await save(this.ft.records, record))) {
        this.notice = { key: "full" };
        return;
      }
      this.show(record);
      this.say("hello");
    });
  }

  enter(id) {
    return this.run(async () => {
      const record = await load(this.ft.records, id);
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
      await forget(this.ft.records, id);
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
        if (!(await save(this.ft.records, joined.record))) {
          this.notice = { key: "full" };
          return;
        }
        this.show(joined.record);
      } else {
        const record = await load(this.ft.records, prompt.id);
        if (!record) return;
        this.show(record);
      }
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
    this.live = Boolean(opening.live);
    this.dark = Boolean(opening.dark);
    if (!this.record) await this.reload();
  }

  async reload() {
    const kept = await list(this.ft.records, this.game.id);
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
    if (!(await save(this.ft.records, next))) {
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

  /** Says something about the current match. The answer, or its absence, comes later. */
  say(kind, { game = true } = {}) {
    const record = this.record;
    let data;
    try {
      data = seal(this.envelope(kind, record, game));
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

  /** Answers about a match that is not on screen (or not on this phone), without its game. */
  answer(kind, doc, who = newId()) {
    const message = { p: PROTOCOL, kv: KV, g: this.game.id, gv: this.game.gv, k: kind, doc, who, app: this.app };
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
    const opened = unseal(data, { g: this.game.id, gv: this.game.gv });
    if (!opened) return;
    if (opened.newer) {
      this.notice = { key: "update", vars: { version: opened.newer.app } };
      return;
    }
    const message = opened.message;
    const current = this.record?.id === message.doc ? this.record : null;
    const fromPeer = current && (message.who === peerOf(current) || (!current.game.b && message.who !== current.me));
    if (message.k === "busy" || message.k === "deny") {
      // A phone without the match answers with no seat in it: for the match on screen, it only
      // tells the user what happened there.
      if (!current) return;
      this.stop("ack");
      this.stop("retry");
      this.peerHere = false;
      this.connecting = false;
      this.notice = { key: message.k === "busy" ? "busy" : "denied" };
      return;
    }
    if (message.k === "bye") {
      if (!fromPeer) return;
      this.stop("ack");
      this.peerHere = false;
      this.notice = { key: "left" };
      return;
    }
    if (current) return this.take(current, message);
    return this.elsewhere(message);
  }

  /** A message about a match that is not on screen: open it, join it, or ask the user. */
  async elsewhere(message) {
    const known = await load(this.ft.records, message.doc);
    if (!known) {
      if (message.game?.b) return this.answer("deny", message.doc);
      if (message.k !== "hello") return;
      if (this.screen === "match") {
        this.prompt = { kind: "invited", id: message.doc, message };
        return this.answer("busy", message.doc);
      }
      const joined = await merge(null, message.game, this.game, { me: newId(), from: message.who, g: this.game.id, gv: this.game.gv, id: message.doc });
      if (joined.verdict !== "took") return this.answer("deny", message.doc);
      if (!(await save(this.ft.records, joined.record))) {
        this.notice = { key: "full" };
        return;
      }
      this.show(joined.record);
      return this.take(joined.record, message);
    }
    if (this.screen === "match") {
      // Busy with another match: take what it says, quietly, and let the user choose.
      const quiet = await merge(known, message.game, this.game, { from: message.who });
      if (quiet.verdict === "stranger") return this.answer("deny", message.doc);
      if (quiet.verdict !== "bad") await save(this.ft.records, quiet.record);
      this.prompt = { kind: "elsewhere", id: message.doc };
      return this.answer("busy", message.doc, known.me);
    }
    this.show(known);
    return this.take(known, message);
  }

  /** A message about the match on screen. */
  async take(record, message) {
    const result = await merge(record, message.game, this.game, { from: message.who });
    if (result.verdict === "stranger") return this.answer("deny", message.doc);
    this.present();
    if (result.verdict === "bad") {
      this.notice = { key: "badMove" };
      this.say("sync");
      return;
    }
    if (result.verdict === "fork") this.notice = { key: "fork" };
    let next = result.record;
    if (JSON.stringify(next) !== JSON.stringify(record) && !(await save(this.ft.records, next))) {
      this.notice = { key: "full" };
      return;
    }
    this.record = next;
    const step = await tossStep(next, this.random ? { random: this.random } : {});
    if (step.send) {
      if (!(await save(this.ft.records, step.record))) {
        this.notice = { key: "full" };
        return;
      }
      this.record = next = step.record;
      this.say(step.send);
    } else if (ASKING.includes(message.k) || result.changed || result.verdict === "ahead") {
      // An answer to a question, news, or a copy that lacks some of mine: say what I have.
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
    if (!(await save(this.ft.records, next))) {
      this.notice = { key: "full" };
      return;
    }
    this.record = next;
    this.notice = { key: "abandoned" };
    this.say("sync");
  }
}
