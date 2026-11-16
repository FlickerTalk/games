// The one-way delay and the other phone's clock, from both phones' fastest arrivals: neither clock is trusted.
export class LiveClock {
  // most: ms
  constructor({ window = 40, most = 1000 } = {}) {
    this.window = window;
    this.most = most;
    this.reset();
  }

  reset() {
    this.offsets = [];
    this.theirs = null;
  }

  heard(t, at) {
    if (!Number.isFinite(t) || !Number.isFinite(at)) return;
    this.offsets.push(at - t);
    if (this.offsets.length > this.window) this.offsets.shift();
  }

  told(offset) {
    if (Number.isFinite(offset)) this.theirs = offset;
  }

  get offset() {
    return this.offsets.length ? Math.min(...this.offsets) : null;
  }

  get latency() {
    if (this.offset === null || this.theirs === null) return null;
    return Math.min(this.most, Math.max(0, (this.offset + this.theirs) / 2));
  }

  theirNow(now) {
    const offset = this.offset;
    return offset === null ? null : now - offset + (this.latency ?? 0);
  }

  age(t, now) {
    const theirs = this.theirNow(now);
    return theirs === null ? 0 : Math.max(0, theirs - t);
  }
}
