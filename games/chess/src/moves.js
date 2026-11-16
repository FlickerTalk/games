import { Chess } from "chess.js";
import { cellOf, cellsOf } from "./squares.js";

export const MOVE_MS = 320;
export const BURST_MS = 450;
export const SHAKE_MS = 450;

const UCI = /^([a-h][1-8])([a-h][1-8])([qrbn]?)$/;
const ROOKS = { k: ["h", "f"], q: ["a", "d"] };

const clamp = (value) => Math.min(1, Math.max(0, value));
const placement = (fen) => fen.split(" ", 2).join(" ");

function replayed(before, uci) {
  const [, from, to, promotion] = UCI.exec(uci);
  try {
    return new Chess(before).move(promotion ? { from, to, promotion } : { from, to });
  } catch {
    return null;
  }
}

export function planMove(before, after, uci) {
  if (!before || !after || typeof uci !== "string" || !UCI.test(uci)) return null;
  const played = replayed(before, uci);
  if (!played || placement(played.after) !== placement(after)) return null;
  const [was, now] = [cellsOf(before), cellsOf(after)];
  const at = (cells, square) => cells[cellOf(square)];
  const { from, to, flags } = played;
  const takenAt = flags.includes("e") ? `${to[0]}${from[1]}` : to;
  const side = ROOKS[flags.includes("k") ? "k" : flags.includes("q") ? "q" : ""];
  const rook = side && { piece: at(was, `${side[0]}${from[1]}`), from: `${side[0]}${from[1]}`, to: `${side[1]}${from[1]}` };
  return {
    piece: at(was, from),
    landed: at(now, to),
    from,
    to,
    captured: played.captured ? { square: takenAt, piece: at(was, takenAt) } : null,
    rook: rook || null,
  };
}

const travelOf = (travel) => (travel ? MOVE_MS : 0);

export function moveFrame(plan, elapsed, { travel = true } = {}) {
  const travelMs = travelOf(travel);
  const landed = elapsed >= travelMs;
  const { captured } = plan;
  const burning = captured && landed && elapsed < travelMs + BURST_MS;
  return {
    progress: travelMs ? clamp(elapsed / travelMs) : 1,
    standing: captured && !landed ? [captured] : [],
    bursts: burning ? [{ square: captured.square, progress: (elapsed - travelMs) / BURST_MS }] : [],
    done: elapsed >= travelMs + (captured ? BURST_MS : 0),
  };
}

export function cuesBetween(plan, from, to, { travel = true } = {}) {
  const landing = travelOf(travel);
  return plan.captured && landing > from && landing <= to ? ["capture"] : [];
}

export function shakeAt(elapsed) {
  if (!(elapsed >= 0 && elapsed < SHAKE_MS)) return 0;
  const progress = elapsed / SHAKE_MS;
  return Math.sin(progress * Math.PI * 2) * (1 - progress * 0.6);
}
