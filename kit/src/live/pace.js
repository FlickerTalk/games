export class Pacer {
  // both in ms
  constructor({ every = 83, patience = 1000 } = {}) {
    this.every = every;
    this.patience = patience;
    this.reset();
  }

  reset() {
    this.last = null;
    this.waiting = false;
  }

  due(now) {
    if (this.last === null) return true;
    const since = now - this.last;
    return since >= (this.waiting ? this.patience : this.every);
  }

  sent(now) {
    this.last = now;
    this.waiting = true;
  }

  done() {
    this.waiting = false;
  }
}
