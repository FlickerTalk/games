import { EMPTY, place, spots } from "./court.js";
import { pieceOf } from "./pieces.js";
import { placeInRound } from "./round.js";
import { variantOf } from "./variants.js";

function orders(slots) {
  if (slots.length <= 1) return [slots];
  return slots.flatMap((slot) => orders(slots.filter((one) => one !== slot)).map((rest) => [slot, ...rest]));
}

function blocked(court, x, y) {
  return x < 0 || y < 0 || x >= court.size || y >= court.size || court.cells[y * court.size + x] !== EMPTY;
}

function holes(court) {
  let count = 0;
  for (let at = 0; at < court.cells.length; at += 1) {
    const x = at % court.size;
    const y = Math.floor(at / court.size);
    if (court.cells[at] === EMPTY && blocked(court, x - 1, y) && blocked(court, x + 1, y) && blocked(court, x, y - 1) && blocked(court, x, y + 1)) count += 1;
  }
  return count;
}

function contact(court, tiles) {
  let touching = 0;
  for (const at of tiles) {
    const x = at % court.size;
    const y = Math.floor(at / court.size);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = (y + dy) * court.size + x + dx;
      if (!tiles.includes(next) && blocked(court, x + dx, y + dy)) touching += 1;
    }
  }
  return touching;
}

function worth(court, laid) {
  const lines = laid.lines.length;
  return lines * 100 + (lines > 1 ? lines * 60 : 0) + (laid.emptied ? 300 : 0) + contact(court, laid.tiles) * 3 - holes(laid.court) * 25;
}

function bestSpot(court, piece, beds) {
  let best = null;
  for (const at of spots(court, piece)) {
    const laid = place(court, piece, at, { beds });
    const value = worth(court, laid);
    if (!best || value > best.value) best = { at, value, court: laid.court };
  }
  return best;
}

function planValue(round, order, beds) {
  let court = round.court;
  let value = 0;
  let first = null;
  let step = 0;
  for (const slot of order) {
    const id = round.slots[slot];
    if (!id) continue;
    const found = bestSpot(court, pieceOf(id), beds);
    if (!found) break;
    first ??= [slot, found.at];
    value += 1000 + found.value * (1 + 0.05 * (3 - step));
    court = found.court;
    step += 1;
  }
  return { value, first };
}

function randomMove(round, random) {
  const moves = round.slots.flatMap((id, slot) => (id ? spots(round.court, pieceOf(id)).map((at) => [slot, at]) : []));
  return moves[Math.min(moves.length - 1, Math.floor(random() * moves.length))] ?? null;
}

export function robotMove(round, { skill = 1, random = Math.random } = {}) {
  if (random() >= skill) {
    const loose = randomMove(round, random);
    if (loose) return loose;
  }
  const beds = variantOf(round.variant).beds;
  let best = null;
  for (const order of orders(round.slots.map((_, slot) => slot))) {
    const plan = planValue(round, order, beds);
    if (plan.first && (!best || plan.value > best.value)) best = plan;
  }
  return best?.first ?? randomMove(round, random);
}

export function robotRound(round, options = {}) {
  let now = round;
  while (!now.over) {
    const move = robotMove(now, options);
    if (!move) break;
    now = placeInRound(now, ...move).round;
  }
  return now;
}
