import { randomOf } from "../../../kit/src/canvas/random.js";

export const MOST_SHOTS = 60;
export const STEPS = 4095;

export const STAGES = Object.freeze([
  Object.freeze({ range: 10, step: 1, card: "dots" }),
  Object.freeze({ range: 10, step: 1, card: "digit" }),
  Object.freeze({ range: 20, step: 1, card: "digit" }),
  Object.freeze({ range: 100, step: 10, card: "digit" }),
  Object.freeze({ range: 100, step: 1, card: "digit" }),
  Object.freeze({ range: 1, card: "fraction", parts: Object.freeze([2, 3, 4, 5]) }),
  Object.freeze({ range: 1000, step: 10, card: "digit" }),
]);

const EDGE = 0.03;
const TRIES = 40;
const COLOURS = 6;

export const stageOf = (index) => STAGES[index] ?? STAGES[0];

export const quantise = (share) => Math.round(Math.min(1, Math.max(0, Number.isFinite(share) ? share : 0)) * STEPS) / STEPS;

function draw(stage, random) {
  if (stage.card === "fraction") {
    const parts = stage.parts[Math.floor(random() * stage.parts.length)];
    const filled = 1 + Math.floor(random() * (parts - 1));
    return { value: filled / parts, share: filled / parts, card: { kind: "fraction", parts, filled } };
  }
  const value = stage.step * (1 + Math.floor(random() * (stage.range / stage.step - 1)));
  return { value, share: value / stage.range, card: { kind: stage.card, value } };
}

export function numbersOf(seed, stageIndex) {
  const stage = stageOf(stageIndex);
  const random = randomOf(`${seed}/numbers/${STAGES.indexOf(stage)}`);
  const numbers = [];
  for (let index = 0; index < MOST_SHOTS; index += 1) {
    let number = draw(stage, random);
    for (let again = 0; again < 8 && number.share === numbers[index - 1]?.share; again += 1) number = draw(stage, random);
    numbers.push({ ...number, size: Math.floor(random() * 3) });
  }
  return numbers;
}

function decoy(random, share, spread, first) {
  if (!first) return EDGE + random() * (1 - 2 * EDGE);
  const gap = spread * (1 + random() * 0.5);
  const side = random() < 0.5 ? -1 : 1;
  const near = share + side * gap;
  return near >= EDGE && near <= 1 - EDGE ? near : share - side * gap;
}

export function balloonsOf(seed, index, number, { count, spread }) {
  const random = randomOf(`${seed}/balloons/${index}`);
  const colour = Math.floor(random() * COLOURS);
  const balloons = [{ share: number.share, size: number.size, colour, lift: random(), real: true }];
  for (let tries = 0; tries < TRIES && balloons.length < count; tries += 1) {
    const share = decoy(random, number.share, spread, balloons.length === 1 && tries === 0);
    const size = Math.floor(random() * 3);
    const lift = random();
    if (share < EDGE || share > 1 - EDGE || balloons.some((one) => Math.abs(one.share - share) < spread)) continue;
    balloons.push({ share, size, colour: (colour + balloons.length) % COLOURS, lift, real: false });
  }
  return balloons;
}
