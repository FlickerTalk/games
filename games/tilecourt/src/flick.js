import { localFlick } from "../../../kit/src/canvas/index.js";
import { placeInRound, startRound } from "./round.js";
import { robotMove } from "./robot.js";

export function flickStart({ variant, seed, mix, skill }) {
  const player = localFlick({
    seed,
    start: () => startRound({ variant, seed, mix }),
    step: (round, random) => {
      const move = robotMove(round, { skill, random });
      return move ? placeInRound(round, ...move).round : null;
    },
    over: (round) => Boolean(round.over),
  });
  return {
    player,
    get round() {
      return player.state;
    },
  };
}

export const flickUpTo = (flick, trays) => (flick.player.upTo((round) => round.tray >= trays), flick);

export const flickFinish = (flick) => (flick.player.finish(), flick);
