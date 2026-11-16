import { commitText, commitTextSecond, honestAnswer, play, revealText } from "./rules.js";

export const secretMove = (side, lang, salt, word) => (side === 0 ? commitText(lang, salt, word) : commitTextSecond(salt, word));

export const guessMove = (state, side, word, guess) => `${honestAnswer(state, side, word)}>${guess}`;

// the rules take side 0's lone answer only once the round is decided, so the board sends it by itself
export function dueMove(state, side, word, salt) {
  if (state.phase === "reveal") return revealText(salt, word);
  if (state.phase !== "guess" || side !== 0) return null;
  const answer = honestAnswer(state, 0, word);
  return answer && !play(state, answer, 0).error ? answer : null;
}
