import { describe, expect, it } from "vitest";
import { dueMove, guessMove, secretMove } from "../src/picking.js";
import { commitHash, commitText, commitTextSecond, feedback, honestAnswer, initial, play, revealText, turn } from "../src/rules.js";

const SALT = new Uint8Array(24).fill(0x5a);
const PLACED = [commitText("en", SALT, "crane"), commitTextSecond(SALT, "eagle")];

function after(moves) {
  let state = initial();
  for (const move of moves) {
    const played = play(state, typeof move === "function" ? move(state) : move, turn(state));
    if (played.error) throw new Error(`${move}: ${played.error}`);
    state = played.state;
  }
  return state;
}

const answerB = (s) => honestAnswer(s, 1, "eagle");
const answerA = (s) => honestAnswer(s, 0, "crane");

describe("the moves the board makes", () => {
  it("commits the secret word, with the language of the words for the first side only", () => {
    expect(secretMove(0, "es", SALT, "perro")).toBe(`ces${commitHash(SALT, "perro")}`);
    expect(secretMove(1, "es", SALT, "perro")).toBe(`c${commitHash(SALT, "perro")}`);
  });

  it("sends a guess with the honest answer to the other side's last guess", () => {
    const state = after([...PLACED, ">stare"]);
    expect(guessMove(state, 1, "eagle", "about")).toBe(`${feedback("stare", "eagle")}>about`);
    expect(guessMove(after(PLACED), 0, "crane", "stare")).toBe(">stare");
  });

  it("owes the closing answer on its own once the round is decided, and nothing while it goes on", () => {
    const going = after([...PLACED, ">stare", (s) => `${answerB(s)}>about`]);
    expect(dueMove(going, 0, "crane", SALT)).toBeNull();
    const decided = after([...PLACED, ">stare", (s) => `${answerB(s)}>about`, (s) => `${answerA(s)}>eagle`, (s) => `${answerB(s)}>other`]);
    expect(dueMove(decided, 0, "crane", SALT)).toBe(feedback("other", "crane"));
    expect(dueMove(decided, 1, "eagle", SALT)).toBeNull();
  });

  it("reveals the word and its salt once the round is over", () => {
    const revealing = after([...PLACED, ">stare", (s) => `${answerB(s)}>about`, (s) => `${answerA(s)}>eagle`, (s) => `${answerB(s)}>other`, answerA]);
    expect(revealing.phase).toBe("reveal");
    expect(dueMove(revealing, 0, "crane", SALT)).toBe(revealText(SALT, "crane"));
    expect(dueMove(after([]), 0, "crane", SALT)).toBeNull();
  });
});
