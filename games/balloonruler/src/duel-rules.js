import { sameRoundRules } from "../../../kit/src/canvas/same-rounds.js";
import { readReport } from "./report.js";

export const DUEL_RULES = sameRoundRules({ id: "balloonruler", gv: 1, read: readReport });
