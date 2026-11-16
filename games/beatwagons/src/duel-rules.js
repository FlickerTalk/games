import { decodeTries, replayTries } from "./puzzle.js";
import { checkTrain, decodeTrain } from "./train.js";

const initial = () => ({ train: null, tries: null });

const turn = (state) => (state.train === null ? 0 : 1);

function result(state) {
  if (!state.tries) return null;
  return { winner: null, wrongs: replayTries(decodeTrain(state.train), decodeTries(state.tries)).wrongs };
}

function play(state, move, side) {
  if (state.tries) return { error: "over" };
  if (side !== turn(state)) return { error: "turn" };
  if (state.train === null) {
    const train = decodeTrain(move);
    if (!train) return { error: "bad" };
    const why = checkTrain(train);
    return why ? { error: why } : { state: { train: move, tries: null } };
  }
  const tries = decodeTries(move);
  if (!tries) return { error: "bad" };
  if (!replayTries(decodeTrain(state.train), tries)) return { error: "unsolved" };
  return { state: { train: state.train, tries: move } };
}

export const DUEL_RULES = Object.freeze({ id: "beatwagons", gv: 1, initial, turn, play, result });
