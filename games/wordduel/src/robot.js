import { fromBase64url, toBase64url } from "./sha256.js";
import { SALT_BYTES, commitText, commitTextSecond, feedback, honestAnswer, langFor, play, result, revealText, words } from "./rules.js";

const pick = (list, random) => list[Math.min(list.length - 1, Math.floor(random() * list.length))];

function place(state, side, memory, random, lang) {
  const language = side === 0 ? langFor(lang) : state.lang;
  const word = pick(words(language).answers, random);
  const salt = Uint8Array.from({ length: SALT_BYTES }, () => Math.floor(random() * 256));
  memory.word = word;
  memory.salt = toBase64url(salt);
  return side === 0 ? commitText(language, salt, word) : commitTextSecond(salt, word);
}

function guess(state, side, random) {
  const { answers, accepted } = words(state.lang);
  const said = state.guesses[side];
  const told = state.answers[1 - side];
  const fits = (word) => !said.includes(word) && said.every((one, at) => told[at] === undefined || feedback(one, word) === told[at]);
  const likely = answers.filter(fits);
  if (likely.length) return pick(likely, random);
  const rare = [...accepted].filter(fits);
  return pick(rare.length ? rare : answers, random);
}

export const robot = {
  move(state, side, memory, random, { lang } = {}) {
    if (result(state)) return null;
    if (state.phase === "place") return place(state, side, memory, random, lang);
    if (state.phase === "reveal") return revealText(fromBase64url(memory.salt), memory.word);
    const answer = honestAnswer(state, side, memory.word);
    if (answer && !play(state, answer, side).error) return answer;
    return `${answer}>${guess(state, side, random)}`;
  },
};
