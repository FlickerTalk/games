const EPSILON = 1e-9;

// Turns frame times into whole simulation steps: the simulation only ever moves by `step` ms.
export class FixedSteps {
  // step and stall: ms
  constructor({ step = 1000 / 120, most = 12, stall = 250 } = {}) {
    Object.assign(this, { step, most, stall });
    this.total = 0;
    this.reset();
  }

  reset() {
    this.last = null;
    this.carry = 0;
  }

  due(now) {
    const gap = this.last === null ? 0 : now - this.last;
    this.last = now;
    if (!(gap > 0) || gap > this.stall) {
      this.carry = 0;
      return 0;
    }
    this.carry += gap;
    let count = 0;
    while (this.carry >= this.step - EPSILON && count < this.most) {
      this.carry -= this.step;
      count += 1;
    }
    this.carry = count === this.most ? 0 : Math.max(0, this.carry);
    this.total += count;
    return count;
  }
}
