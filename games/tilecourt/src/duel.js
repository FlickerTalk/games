import { SameRounds } from "../../../kit/src/canvas/index.js";
import { DUEL_RULES } from "./duel-rules.js";

export { DUEL_RULES };

export class Duel extends SameRounds {
  constructor(options) {
    super({ ...options, rules: DUEL_RULES });
  }
}
