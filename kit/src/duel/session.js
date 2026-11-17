import { Session } from "../live/session.js";

// ms the other phone may stay quiet once either player paused, since a hidden page sends nothing
export const PAUSED_SILENCE = 60_000;

// A live session decided by a score both phones agree on: each ends with its final state, over once both have.
export class ScoredSession extends Session {
  constructor({ paused = () => false, timing = {}, ...options }) {
    super({ ...options, timing: { paused: PAUSED_SILENCE, ...timing } });
    this.pausedIn = paused;
  }

  reset() {
    super.reset();
    this.mineState = null;
    this.theirState = null;
    this.held = { me: false, them: false };
    this.theirLast = -1;
  }

  silence() {
    return this.held.me || this.held.them ? this.timing.paused : this.timing.silence;
  }

  ticked(message) {
    if (this.running) {
      this.theirState = message.s;
      if (message.t >= this.theirLast) {
        this.theirLast = message.t;
        this.held.them = this.pausedIn(message.s);
      }
    }
    super.ticked(message);
  }

  // soon: a tick that cannot wait for the next beat, sent as soon as the core took the last one
  run(t, state, now = this.clock(), { soon = false } = {}) {
    const paused = this.pausedIn(state);
    if (paused !== this.held.me) {
      if (!paused) this.heardAt = Math.max(this.heardAt, now);
      this.held.me = paused;
      this.pacer.reset();
    } else if (soon && !this.pacer.waiting) this.pacer.last = null;
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
}
