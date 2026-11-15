const KEEP = 3;

const wrap = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));

export class Follow {
  // delay and ahead in ms; window: how many arrivals estimate the other phone's clock
  constructor({ delay = 100, ahead = 250, window = 40, angles = [] } = {}) {
    this.delay = delay;
    this.ahead = ahead;
    this.window = window;
    this.angles = angles;
    this.reset();
  }

  reset() {
    this.states = [];
    this.offsets = [];
  }

  get size() {
    return this.states.length;
  }

  push(state, t, at) {
    if (!Number.isFinite(t) || !Number.isFinite(at) || !state || typeof state !== "object") return false;
    const newest = this.states.at(-1);
    if (newest && t <= newest.t) return false;
    this.states.push({ t, state });
    if (this.states.length > KEEP) this.states.shift();
    this.offsets.push(at - t);
    if (this.offsets.length > this.window) this.offsets.shift();
    return true;
  }

  at(now) {
    const states = this.states;
    if (!states.length) return null;
    const shown = now - Math.min(...this.offsets) - this.delay;
    const newest = states.at(-1);
    if (shown >= newest.t) {
      const before = states.at(-2);
      if (!before) return { ...newest.state };
      const span = newest.t - before.t;
      return this.blend(before, newest, (span + Math.min(shown - newest.t, this.ahead)) / span);
    }
    let at = states.length - 1;
    while (at > 0 && states[at - 1].t > shown) at -= 1;
    if (at === 0) return { ...states[0].state };
    const one = states[at - 1];
    const two = states[at];
    return this.blend(one, two, (shown - one.t) / (two.t - one.t));
  }

  blend(one, two, u) {
    const out = {};
    for (const [key, value] of Object.entries(two.state)) {
      const from = one.state[key];
      if (typeof value !== "number" || typeof from !== "number") {
        out[key] = value;
        continue;
      }
      const angle = this.angles.includes(key);
      const moved = from + (angle ? wrap(value - from) : value - from) * u;
      out[key] = angle ? wrap(moved) : moved;
    }
    return out;
  }
}
