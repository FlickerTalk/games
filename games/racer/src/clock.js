const LONGEST_STEP = 0.05;
const STALLED = 0.25;

export function createClock() {
  let last = null;
  return {
    tick(now) {
      const seconds = last === null ? 0 : (now - last) / 1000;
      last = now;
      if (seconds <= 0 || seconds > STALLED) return 0;
      return Math.min(seconds, LONGEST_STEP);
    },
    reset() {
      last = null;
    },
  };
}
