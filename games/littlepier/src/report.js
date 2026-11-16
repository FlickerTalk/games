import { SEED_LENGTH, isSeed } from "../../../kit/src/canvas/random.js";
import { MOST_VISITORS, isFind, visitorsOf } from "./pond.js";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export const MOST_LENGTH = SEED_LENGTH + MOST_VISITORS;

export const encodeReport = (seed, ids) => seed + ids.map((id) => LETTERS[id]).join("");

export function decodeReport(text) {
  if (typeof text !== "string" || text.length > MOST_LENGTH) return null;
  const seed = text.slice(0, SEED_LENGTH);
  if (!isSeed(seed)) return null;
  const ids = [...text.slice(SEED_LENGTH)].map((letter) => LETTERS.indexOf(letter));
  return ids.includes(-1) ? null : { seed, ids };
}

export function readReport(move) {
  const report = decodeReport(move);
  if (!report) return null;
  const visitors = visitorsOf(report.seed);
  const { ids } = report;
  if (new Set(ids).size !== ids.length || ids.some((id) => id >= visitors.length)) return null;
  const kinds = [...new Set(ids.map((id) => visitors[id].kind).filter((kind) => !isFind(kind)))].sort((one, two) => one - two);
  return { seed: report.seed, score: ids.length, kinds };
}
