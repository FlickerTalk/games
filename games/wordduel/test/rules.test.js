// The rules of Word Duel as the kit asks for them: two secret words committed to by hash, guesses
// answered move by move, six each at most, the round decided once both have as many guesses,
// both words revealed and every answer checked against them.
import { describe, expect, it } from "vitest";
import { PLAYS } from "../../../preview/shots.js";
import { LANGS, LENGTH, MAX_GUESSES, accepted, commitHash, commitText, commitTextSecond, feedback, honest, honestAnswer, initial, langFor, parseReveal, play, result, revealText, solvedAt, suggest, turn, words } from "../src/rules.js";

const SALT_A = Uint8Array.from({ length: 24 }, (_, at) => at + 1);
const SALT_B = new Uint8Array(24).fill(0x5a);
const A = "crane";
const B = "eagle";
const PLACED = [commitText("en", SALT_A, A), commitTextSecond(SALT_B, B)];

function after(moves, from = initial()) {
  let state = from;
  for (const move of moves) {
    const played = play(state, typeof move === "function" ? move(state) : move, turn(state));
    if (played.error) throw new Error(`${move}: ${played.error}`);
    state = played.state;
  }
  return state;
}
const answerB = (state) => honestAnswer(state, 1, B);
const answerA = (state) => honestAnswer(state, 0, A);

describe("the words", () => {
  it("come in English and Spanish, five letters each, the common ones among the accepted", () => {
    expect(LANGS).toEqual(["en", "es"]);
    for (const lang of LANGS) {
      const { accepted: all, answers } = words(lang);
      expect(all.size).toBeGreaterThan(2000);
      expect(answers.length).toBeGreaterThan(1000);
      for (const word of answers) expect(all.has(word), `${lang}: ${word}`).toBe(true);
      for (const word of all) expect(word, lang).toMatch(/^[a-zñ]{5}$/);
    }
    expect(accepted("en", "crane")).toBe(true);
    expect(accepted("en", "zzzzz")).toBe(false);
    expect(accepted("es", "señor")).toBe(true);
    expect(accepted("es", "ahora")).toBe(true);
    expect(accepted("es", "crane")).toBe(false);
    expect(accepted("en", "cran")).toBe(false);
    expect(langFor("es")).toBe("es");
    expect(langFor("es-MX")).toBe("es");
    expect(langFor("de")).toBe("en");
    expect(langFor(undefined)).toBe("en");
    expect(accepted("es", suggest("es", () => 0.3))).toBe(true);
    expect(accepted("en", suggest("en", () => 0.999))).toBe(true);
  });

  it("answer a guess letter by letter, counting repeated letters only as often as the word has them", () => {
    expect(feedback("crane", "crane")).toBe("ggggg");
    expect(feedback("crane", "react")).toBe("yygby");
    expect(feedback("allee", "eagle")).toBe("yybyg");
    expect(feedback("aaaab", "baaaa")).toBe("ygggy");
    expect(feedback("zzzzz", "crane")).toBe("bbbbb");
    expect(feedback("eeeee", "eagle")).toBe("gbbbg");
  });
});

describe("placing", () => {
  it("takes side 0's commitment with the language, then side 1's, then the guessing begins with side 0", () => {
    const state = initial();
    expect(turn(state)).toBe(0);
    const one = after([PLACED[0]]);
    expect(one.lang).toBe("en");
    expect(turn(one)).toBe(1);
    const both = after(PLACED);
    expect(both.phase).toBe("guess");
    expect(turn(both)).toBe(0);
    expect(commitText("es", SALT_A, A)).toMatch(/^ces[A-Za-z0-9_-]{43}$/);
    expect(commitHash(SALT_A, A)).not.toBe(commitHash(SALT_B, A));
    expect(commitHash(SALT_A, A)).not.toBe(commitHash(SALT_A, B));
  });

  it("refuses anything else", () => {
    expect(play(initial(), commitTextSecond(SALT_A, A), 0)).toEqual({ error: "bad" }, "side 0 says the language");
    expect(play(initial(), `cfr${commitHash(SALT_A, A)}`, 0)).toEqual({ error: "bad" });
    expect(play(initial(), ">crane", 0)).toEqual({ error: "bad" });
    expect(play(initial(), PLACED[0], 1)).toEqual({ error: "turn" });
    expect(play(after([PLACED[0]]), PLACED[0], 1)).toEqual({ error: "bad" }, "side 1 does not say the language");
  });
});

describe("guessing", () => {
  const placed = after(PLACED);

  it("takes a guess without an answer only from side 0 at first, then an answer with every guess", () => {
    expect(play(placed, "bbbbb>stare", 0)).toEqual({ error: "illegal" });
    const one = after([">stare"], placed);
    expect(one.guesses[0]).toEqual(["stare"]);
    expect(turn(one)).toBe(1);
    expect(play(one, ">about", 1)).toEqual({ error: "illegal" }, "an answer is owed");
    expect(play(one, "xxxxx>about", 1)).toEqual({ error: "bad" });
    expect(play(one, "bbybg>zzzzz", 1)).toEqual({ error: "illegal" }, "not a word");
    expect(play(one, "bbybg>abou", 1)).toEqual({ error: "bad" });
    const two = after([(s) => `${answerB(s)}>about`], one);
    expect(two.answers[1]).toEqual([feedback("stare", B)]);
    expect(two.guesses[1]).toEqual(["about"]);
    expect(turn(two)).toBe(0);
  });

  it("knows the honest answer from the word", () => {
    expect(honestAnswer(placed, 1, B)).toBe("");
    expect(honestAnswer(after([">stare"], placed), 1, B)).toBe(feedback("stare", "eagle"));
  });

  it("ends the guessing with side 0's answer alone once a side has the word and both have as many guesses", () => {
    // Side 0 guesses B's word with its second guess; side 1 still takes its second.
    const line = after([">stare", (s) => `${answerB(s)}>about`, (s) => `${answerA(s)}>eagle`, (s) => `${answerB(s)}>other`], placed);
    expect(solvedAt(line, 0)).toBe(2);
    expect(solvedAt(line, 1)).toBeNull();
    expect(turn(line)).toBe(0);
    expect(play(line, `${answerA(line)}>crane`, 0)).toEqual({ error: "illegal" }, "no more guesses: the round is decided");
    const ended = after([answerA], line);
    expect(ended.phase).toBe("reveal");
    expect(turn(ended)).toBe(0);
    // Side 1 has the word on its second guess while side 0 does not: side 0 answers alone too.
    const theirs = after([">stare", (s) => `${answerB(s)}>crane`], placed);
    expect(play(theirs, `${answerA(theirs)}>eagle`, 0)).toEqual({ error: "illegal" });
    expect(after([answerA], theirs).phase).toBe("reveal");
  });

  it("allows six guesses each and no more, and then the round is decided without a winner", () => {
    const misses0 = ["stare", "about", "other", "which", "think", "would"];
    const misses1 = ["there", "right", "going", "could", "never", "sorry"];
    let state = after([">stare"], placed);
    for (let at = 0; at < MAX_GUESSES; at += 1) {
      state = after([(s) => `${answerB(s)}>${misses1[at]}`], state);
      if (at < MAX_GUESSES - 1) state = after([(s) => `${answerA(s)}>${misses0[at + 1]}`], state);
    }
    expect(state.guesses[0]).toHaveLength(6);
    expect(state.guesses[1]).toHaveLength(6);
    expect(play(state, `${answerA(state)}>crane`, 0)).toEqual({ error: "illegal" });
    const ended = after([answerA, revealText(SALT_A, A), revealText(SALT_B, B)], state);
    expect(result(ended)).toEqual({ winner: null, reason: "nobody", guesses: [null, null] });
  });
});

describe("revealing", () => {
  const decided = after([">stare", (s) => `${answerB(s)}>about`, (s) => `${answerA(s)}>eagle`, (s) => `${answerB(s)}>other`, answerA], after(PLACED));

  it("gives the round to the side that needed fewer guesses when both words match", () => {
    const ended = after([revealText(SALT_A, A), revealText(SALT_B, B)], decided);
    expect(ended.phase).toBe("done");
    expect(result(ended)).toEqual({ winner: 0, reason: "solved", guesses: [2, null] });
    expect(ended.reveals[1].word).toBe("eagle");
    expect(play(ended, revealText(SALT_A, A), 0)).toEqual({ error: "over" });
  });

  it("gives the round to the other side when a word does not match its commitment or its answers", () => {
    expect(result(after([revealText(SALT_B, A), revealText(SALT_B, B)], decided))).toEqual({ winner: 1, reason: "cheat" });
    expect(result(after([revealText(SALT_A, A), revealText(SALT_A, B)], decided))).toEqual({ winner: 0, reason: "cheat" });
    expect(result(after([revealText(SALT_B, A), revealText(SALT_A, B)], decided))).toEqual({ winner: null, reason: "both" });
    // Side 1 answered honestly for "eagle"; had its word been "eager", the answers would not hold.
    expect(honest(decided, 1, "eagle")).toBe(true);
    expect(honest(decided, 1, "eager")).toBe(false);
    const reveal = revealText(SALT_A, A);
    expect(reveal).toHaveLength(38);
    expect(parseReveal(reveal)).toEqual({ salt: SALT_A, word: "crane" });
    expect(parseReveal(`${reveal}x`)).toBeNull();
    expect(play(decided, "rnonsense", 0)).toEqual({ error: "bad" });
    expect(LENGTH).toBe(5);
  });

  it("plays the screenshot lines out: the starter wins one, the other is a tie", () => {
    const { opening, winning, draw } = PLAYS.wordduel;
    expect(result(after(opening))).toBeNull();
    expect(result(after([...opening, ...winning]))).toEqual({ winner: 0, reason: "solved", guesses: [2, null] });
    expect(result(after(draw))).toEqual({ winner: null, reason: "tie", guesses: [2, 2] });
  });

  it("never changes the state it is given", () => {
    const state = after([">stare"], after(PLACED));
    const copy = structuredClone(state);
    play(state, "bbbbb>about", 1);
    expect(state).toEqual(copy);
  });
});
