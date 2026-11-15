export class Pacer {
  // ms between two messages
  constructor({ every = 83 } = {}) {
    this.every = every;
    this.reset();
  }

  reset() {
    this.last = null;
    this.waiting = false;
  }

  due(now) {
    return !this.waiting && (this.last === null || now - this.last >= this.every);
  }

  sent(now) {
    this.last = now;
    this.waiting = true;
  }

  done() {
    this.waiting = false;
  }
}
