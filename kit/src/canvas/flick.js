import { randomOf } from "./random.js";

export function playMode(opening, chat) {
  if (!chat) return "alone";
  if (opening?.solo === true) return "flick";
  return opening?.live ? "friend" : "alone";
}

export function localFlick({ seed, start, step, over }) {
  const random = randomOf(`${seed}/flick`);
  const flick = {
    state: start(random),
    upTo(reached) {
      while (!over(flick.state) && !reached(flick.state)) {
        const next = step(flick.state, random);
        if (!next) break;
        flick.state = next;
      }
      return flick;
    },
    finish: () => flick.upTo(() => false),
  };
  return flick;
}
