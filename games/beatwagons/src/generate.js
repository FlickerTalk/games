import { randomOf } from "../../../kit/src/canvas/random.js";
import { BEATS, GAPS_MOST, KINDS, LEAST, MOST, checkTrain, makeTrain, periodOf, wagonOf } from "./train.js";

const ATTEMPTS = 60;
const BEATS_CHANCE = 0.6;

const whole = (value, low, high) => Math.min(high, Math.max(low, Math.floor(Number.isFinite(value) ? value + 1e-9 : low)));

export function shapeOf(values = {}) {
  const length = whole(values.length, LEAST, MOST);
  return {
    length,
    unit: Math.min(whole(values.unit, 2, 3), Math.floor(length / 2)),
    gaps: whole(values.gaps, 1, GAPS_MOST),
    kinds: whole(values.kinds, 2, KINDS),
    beats: whole(values.beats, 0, 1) === 1,
    choices: whole(values.choices, 3, 4),
  };
}

const pick = (random, count) => Math.floor(random() * count);

function unitOf(shape, random) {
  const counted = shape.beats && random() < BEATS_CHANCE;
  return Array.from({ length: shape.unit }, () => wagonOf(pick(random, shape.kinds), counted ? 1 + pick(random, BEATS) : 1));
}

function gapsFor(shape, random) {
  const places = new Set();
  while (places.size < shape.gaps) places.add(pick(random, shape.length));
  return [...places].sort((one, two) => one - two);
}

export function generateTrain(seed, values) {
  const shape = shapeOf(values);
  const random = randomOf(`${seed}/train`);
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const unit = unitOf(shape, random);
    const wagons = Array.from({ length: shape.length }, (_, at) => unit[at % shape.unit]);
    if (periodOf(wagons) !== shape.unit) continue;
    const train = makeTrain(wagons, gapsFor(shape, random));
    if (checkTrain(train) === null) return train;
  }
  const wagons = Array.from({ length: shape.length }, (_, at) => wagonOf(at % 2));
  return makeTrain(wagons, [shape.length - 1]);
}
