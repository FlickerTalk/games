import { Session } from "../live/session.js";

// A live session decided by a score both phones agree on: each ends with its final state, over once both have.
export class ScoredSession extends Session {
  constructor({ paused = () => false, ...options }) {
    super(options);
    this.pausedIn = paused;
  }

  reset() {
    super.reset();
    this.mineState = null;
    this.theirState = null;
  }

  // an older version pauses its round instead of leaving it
  ticked(message) {
    if (this.running && this.pausedIn(message.s)) return this.gone("left");
    if (this.running) this.theirState = message.s;
    super.ticked(message);
  }

  // soon: a tick that cannot wait for the next beat, sent as soon as the core took the last one
  run(t, state, now = this.clock(), { soon = false } = {}) {
    if (soon && !this.pacer.waiting) this.pacer.last = null;
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
