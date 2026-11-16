const SETTLED = 5;

// When the other phone's word moves something this phone was drawing, it glides there instead of jumping.
export class Glide {
  // over: ms
  constructor({ over = 120, most = Infinity } = {}) {
    this.over = over;
    this.most = most;
    this.reset();
  }

  reset() {
    this.gap = { x: 0, y: 0 };
    this.since = 0;
  }

  at(now) {
    const elapsed = Math.max(0, now - this.since);
    if (elapsed > SETTLED * this.over) return { x: 0, y: 0 };
    const kept = Math.exp(-elapsed / this.over);
    return { x: this.gap.x * kept + 0, y: this.gap.y * kept + 0 };
  }

  jump({ x = 0, y = 0 }, now) {
    if (Math.hypot(x, y) > this.most) {
      this.reset();
      return;
    }
    const left = this.at(now);
    this.gap = { x: left.x - x, y: left.y - y };
    this.since = now;
  }
}
