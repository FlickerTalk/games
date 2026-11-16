import { randomOf } from "../../../kit/src/canvas/random.js";
import { gapsOf } from "./train.js";

export const FLICK_PACE = 1100;
const SLIP_CHANCE = 0.4;

export function flickScript(train, candidates, seed) {
  const random = randomOf(`${seed}/flick`);
  const answers = gapsOf(train).map((at) => train.wagons[at]);
  const slipAt = random() < SLIP_CHANCE ? Math.floor(random() * answers.length) : -1;
  return answers.flatMap((wagon, at) => {
    const others = candidates.filter((one) => one !== wagon);
    if (at !== slipAt || !others.length) return [{ wagon }];
    return [{ wagon: others[Math.floor(random() * others.length)] }, { wagon }];
  });
}

export const replayScript = (tries) => tries.map((wagon) => ({ wagon }));
