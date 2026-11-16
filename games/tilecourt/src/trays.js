import { PIECES, pieceOf } from "./pieces.js";
import { randomOf } from "../../../kit/src/canvas/random.js";

export const STANDARD_MIX = Object.freeze([0.26, 0.3, 0.3, 0.14]);

export function mixFor(large) {
  const weight = Math.max(0, Number.isFinite(large) ? large : 1);
  return Object.freeze(STANDARD_MIX.map((share, family) => (family === 3 ? share * weight : share)));
}

const ALL = PIECES.map((piece) => piece.id);

function pick(random, list) {
  return list[Math.min(list.length - 1, Math.floor(random() * list.length))];
}

function drawPiece(random, families, mix) {
  const weights = mix.map((weight, family) => (families[family].length ? weight : 0));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let left = random() * total;
  for (let family = 0; family < weights.length; family += 1) {
    left -= weights[family];
    if (left < 0 && weights[family] > 0) return pick(random, families[family]);
  }
  return pick(random, families.find((list) => list.length));
}

export function dealTrays(seed, { count = 12, size = 3, pool = ALL, mix = STANDARD_MIX } = {}) {
  const random = randomOf(seed);
  const families = [0, 1, 2, 3].map((family) => pool.filter((id) => pieceOf(id).family === family));
  return Array.from({ length: count }, () => Array.from({ length: size }, () => drawPiece(random, families, mix)));
}
