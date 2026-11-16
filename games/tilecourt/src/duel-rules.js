import { sameRoundRules } from "../../../kit/src/canvas/index.js";
import { decodeReport } from "./report.js";
import { replayRound } from "./round.js";

function readReport(move) {
  const report = decodeReport(move);
  if (!report) return null;
  const round = replayRound({ seed: report.seed, placements: report.placements });
  if (!round?.over) return { error: "unfinished" };
  return { seed: report.seed, score: round.score, done: round.over === "done", lines: round.lines };
}

export const DUEL_RULES = sameRoundRules({ id: "tilecourt", gv: 1, read: readReport });

export const { initial, turn, play, result } = DUEL_RULES;
