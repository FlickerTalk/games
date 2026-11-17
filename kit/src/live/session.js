import { newId as randomId } from "../match.js";
import { Pacer } from "./pace.js";
import { openLive, sealLive } from "./wire.js";

// ms
export const LIVE_TIMING = { countdown: 3000, answer: 8000, silence: 6000, every: 83 };

const PLAYING = ["countdown", "running", "finished"];
const OPEN = ["waiting", "lobby", ...PLAYING];
const ENDED = ["idle", "over", "left"];

export function verdict({ mine = null, theirs, mineClock = 0, theirClock = 0, me = "", peer = "" }) {
  if (theirs === null) return "won";
  if (mine !== null && typeof theirs === "number") return mine < theirs || (mine === theirs && me < peer) ? "won" : "lost";
  if (mine !== null) return theirClock >= mine ? "won" : null;
  if (typeof theirs === "number") return mineClock >= theirs ? "lost" : null;
  return null;
}

export class Session {
  constructor({ ft, g, gv, app, solo = false, check = (state) => state, timing = {}, clock = () => performance.now(), onChange = () => {}, onState = () => {}, newId = randomId }) {
    Object.assign(this, { ft, g, gv, app, solo, check, clock, onChange, onState, newId });
    this.timing = { ...LIVE_TIMING, ...timing };
    this.pacer = new Pacer({ every: this.timing.every });
    this.phase = "idle";
    this.id = null;
    this.me = "";
    this.peer = "";
    this.seat = 0;
    this.startAt = null;
    this.ready = { me: false, them: false };
    this.notice = null;
    this.newer = "";
    this.cut = false;
    this.heardAt = 0;
    this.answering = null;
    this.reset();
  }

  reset() {
    this.mine = null;
    this.theirs = undefined;
    this.mineClock = 0;
    this.theirClock = 0;
    this.result = null;
  }

  set(phase) {
    this.phase = phase;
    this.onChange();
  }

  get running() {
    return PLAYING.includes(this.phase);
  }

  get host() {
    return this.me < this.peer;
  }

  until(now) {
    return this.startAt === null ? 0 : Math.max(0, this.startAt - now);
  }

  start() {
    if (this.running) return;
    if (this.solo) {
      this.id = this.newId();
      this.me = this.newId();
      return this.begin(this.clock() + this.timing.countdown);
    }
    if (this.phase === "lobby") {
      if (this.ready.me) return;
      this.ready.me = true;
      this.send("ready");
      this.set("lobby");
      return this.go();
    }
    if (this.phase !== "waiting") {
      this.id = this.newId();
      this.me = this.newId();
      this.peer = "";
      this.ready = { me: true, them: false };
    }
    this.cut = false;
    this.notice = null;
    this.set("waiting");
    this.send("hello", { ready: true, app: this.app });
    this.wait();
  }

  wait() {
    clearTimeout(this.answering);
    this.answering = setTimeout(() => {
      this.answering = null;
      if (this.phase !== "waiting") return;
      this.notice = "notOpen";
      this.onChange();
    }, this.timing.answer);
  }

  begin(at) {
    this.reset();
    this.startAt = at;
    this.seat = this.solo || this.host ? 0 : 1;
    this.heardAt = this.clock();
    this.pacer.reset();
    this.set("countdown");
  }

  go() {
    if (this.phase !== "lobby" || !this.ready.me || !this.ready.them || !this.host) return;
    this.send("go", { ms: this.timing.countdown });
    this.begin(this.clock() + this.timing.countdown);
  }

  heard(data) {
    if (this.solo) return;
    const opened = openLive(data, { g: this.g, gv: this.gv, check: this.check });
    if (!opened) return;
    if (opened.newer) {
      this.notice = "update";
      this.newer = opened.newer.app;
      return this.onChange();
    }
    const message = opened.message;
    if (message.k === "hello") return this.hello(message);
    if (this.introduces(message)) this.met({ ...message, ready: true, re: true });
    if (!this.peer || message.doc !== this.id || message.who !== this.peer) return;
    if (this.phase === "left" && this.notice !== "left" && message.k === "tick") return this.send("bye");
    this.heardAt = this.clock();
    if (message.k === "ready") return this.readied();
    if (message.k === "go") return this.went(message);
    if (message.k === "tick") return this.ticked(message);
    if (message.k === "done") return this.done(message);
    return this.gone("left");
  }

  // the core may deliver the other phone's ready or go before the hello it sent first
  introduces(message) {
    return !this.peer && this.phase === "waiting" && message.doc === this.id && (message.k === "ready" || message.k === "go");
  }

  hello(message) {
    const fresh = ENDED.includes(this.phase);
    if (message.doc === this.id) {
      if (fresh || !["waiting", "lobby"].includes(this.phase) || (this.peer && message.who !== this.peer)) return;
      return this.met(message);
    }
    if (fresh) {
      if (message.re) return;
      this.id = message.doc;
      this.me = this.newId();
      this.ready = { me: false, them: false };
      this.cut = false;
      this.notice = null;
      this.reset();
      return this.met(message);
    }
    if (!["waiting", "lobby"].includes(this.phase)) return;
    if (message.doc < this.id) {
      this.id = message.doc;
      this.ready.them = false;
      return this.met(message);
    }
    if (!message.re) this.send("hello", { ready: this.ready.me, app: this.app });
  }

  met(message) {
    this.peer = message.who;
    this.heardAt = this.clock();
    this.ready.them ||= message.ready;
    clearTimeout(this.answering);
    this.answering = null;
    if (this.notice === "notOpen") this.notice = null;
    if (!message.re) this.send("hello", { ready: this.ready.me, re: true, app: this.app });
    this.set("lobby");
    this.go();
  }

  readied() {
    if (this.phase !== "lobby") return;
    this.ready.them = true;
    this.set("lobby");
    this.go();
  }

  went(message) {
    if (this.phase !== "lobby" || this.host || !this.ready.me) return;
    this.begin(this.clock() + message.ms);
  }

  ticked(message) {
    if (!this.running) return;
    this.theirClock = Math.max(this.theirClock, message.t);
    this.onState(message.s, message.t, this.clock());
    this.decide();
  }

  done(message) {
    if (this.phase === "over" && this.result.theirs === null && typeof message.t === "number") {
      this.result = { ...this.result, theirs: message.t };
      return this.onChange();
    }
    if (!this.running) return;
    this.theirs = message.t;
    if (message.t !== null) this.theirClock = Math.max(this.theirClock, message.t);
    this.decide();
  }

  gone(notice) {
    if (ENDED.includes(this.phase)) return;
    clearTimeout(this.answering);
    this.answering = null;
    this.notice = notice;
    this.set("left");
  }

  tick(now) {
    if (this.phase === "countdown" && now >= this.startAt) this.set("running");
    if (!this.solo && this.running && this.theirs === undefined && now - this.heardAt > this.silence()) this.gone("silent");
  }

  silence() {
    return this.timing.silence;
  }

  run(t, state, now = this.clock()) {
    if (this.phase !== "running" || this.mine !== null) return;
    this.mineClock = t;
    if (!this.solo && !this.cut && this.pacer.due(now)) {
      this.pacer.sent(now);
      this.send("tick", { t, s: state }, () => this.pacer.done());
    }
    this.decide();
  }

  finish(t) {
    if (this.phase !== "running" || this.mine !== null) return;
    this.mine = t;
    this.mineClock = t;
    this.send("done", { t });
    this.set("finished");
    this.decide();
  }

  rival(t, done) {
    if (!this.solo || !["running", "finished"].includes(this.phase)) return;
    this.theirClock = Math.max(this.theirClock, t);
    if (typeof done === "number") this.theirs = done;
    this.decide();
  }

  decide() {
    if (this.phase === "over") return;
    const outcome = verdict(this);
    if (!outcome) return;
    if (outcome === "lost" && this.mine === null) this.send("done", { t: null });
    this.result = { won: outcome === "won", mine: this.mine, theirs: typeof this.theirs === "number" ? this.theirs : null };
    this.set("over");
  }

  stop() {
    clearTimeout(this.answering);
    this.answering = null;
    if (this.solo || !OPEN.includes(this.phase)) return;
    this.send("bye");
    this.notice = null;
    this.set("left");
  }

  // a send without a connection wakes the other phone by push: after a refusal, nothing until start()
  send(kind, fields = {}, after = () => {}) {
    if (this.solo || this.cut) return after();
    let data;
    try {
      data = sealLive({ g: this.g, gv: this.gv, k: kind, doc: this.id, who: this.me, ...fields });
    } catch {
      return after();
    }
    let sent;
    try {
      sent = Promise.resolve(this.ft.live.send(data));
    } catch {
      sent = Promise.resolve(false);
    }
    sent.then(
      (ok) => {
        after();
        if (!ok) this.refused();
      },
      () => {
        after();
        this.refused();
      },
    );
  }

  refused() {
    if (this.cut) return;
    this.cut = true;
    if (!OPEN.includes(this.phase)) return;
    this.gone("unreachable");
  }
}
