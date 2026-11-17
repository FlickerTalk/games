import { Session } from "../live/session.js";

// ms the other phone may stay quiet once either player paused, since a hidden page sends nothing
export const PAUSED_SILENCE = 60_000;

// A live session decided by a score both phones agree on: each ends with its final state, over once both have.
export class ScoredSession extends Session {
  constructor({ paused = () => false, timing = {}, ...options }) {
    super({ ...options, timing: { paused: PAUSED_SILENCE, ...timing } });
    this.pausedIn = paused;
    this.turns = 0;
  }

  reset() {
    super.reset();
    this.mineState = null;
    this.theirState = null;
    this.held = { me: false, them: false };
    this.theirLast = -1;
    this.owed = false;
  }

  get holding() {
    return this.held.me || this.held.them;
  }

  hold(side, paused) {
    if (this.held[side] === paused) return false;
    this.held[side] = paused;
    this.turns += 1;
    return true;
  }

  silence() {
    return this.holding ? this.timing.paused : this.timing.silence;
  }

  ticked(message) {
    if (this.running) {
      this.theirState = message.s;
      if (message.t >= this.theirLast) {
        this.theirLast = message.t;
        if (this.hold("them", this.pausedIn(message.s)) && !this.held.them) this.owed = true;
      }
    }
    super.ticked(message);
  }

  // soon: a tick that cannot wait for the next beat, sent as soon as the core took the last one
  run(t, state, now = this.clock(), { soon = false } = {}) {
    if (this.hold("me", this.pausedIn(state))) {
      if (!this.held.me) this.heardAt = Math.max(this.heardAt, now);
      this.owed = true;
    }
    if (this.owed) this.pacer.reset();
    else if (this.holding) return;
    else if (soon && !this.pacer.waiting) this.pacer.last = null;
    this.owed = false;
    super.run(t, state, now);
  }

  end(t, state) {
    if (this.phase !== "running" || this.mine !== null) return;
    this.mineState = state;
    this.send("tick", { t, s: state });
    this.finish(t);
  }

  decide() {
    if (this.phase === "over" || this.mine === null) return;
    if (!this.solo && typeof this.theirs !== "number") return;
    this.result = { mine: this.mineState, theirs: this.solo ? null : this.theirState };
    this.set("over");
  }

  // a phone held on the pause can be suspended, so what fails across a pause says nothing about the round
  send(kind, fields = {}, after = () => {}) {
    const turns = this.turns;
    super.send(kind, fields, () => {
      this.excused = this.holding || this.turns !== turns;
      after();
    });
  }

  // the base calls a failed send's after() right before refused()
  refused() {
    if (!this.excused) super.refused();
  }
}
