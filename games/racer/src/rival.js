import { Follow } from '../../../kit/src/live/follow.js';

export const RIVAL = { catchUp: 30, easeSeconds: 0.35, sideSeconds: 0.12, maxStep: 0.1 };

const ease = (seconds, over) => 1 - Math.exp(-seconds / over);

export function createRival() {
  const follow = new Follow({ delay: 100, ahead: 250 });
  let shown = null;
  let lastNow = null;
  return {
    heard: (state, t, at) => follow.push(state, t, at),
    reset() {
      follow.reset();
      shown = null;
      lastNow = null;
    },
    at(now) {
      const target = follow.at(now);
      if (!target) return null;
      const seconds = lastNow === null ? 0 : Math.min(RIVAL.maxStep, Math.max(0, (now - lastNow) / 1000));
      lastNow = now;
      shown = shown ? move(shown, target, seconds) : { distance: target.d, x: target.x };
      return { distance: shown.distance, x: shown.x, speed: target.v, kind: target.k, color: target.c, braking: target.b === 1 };
    },
  };
}

function move(shown, target, seconds) {
  const ahead = shown.distance + target.v * seconds;
  const eased = ahead + (target.d - ahead) * ease(seconds, RIVAL.easeSeconds);
  const step = Math.min(Math.max(0, eased - shown.distance), (target.v + RIVAL.catchUp) * seconds);
  return {
    distance: shown.distance + step,
    x: shown.x + (target.x - shown.x) * ease(seconds, RIVAL.sideSeconds),
  };
}
