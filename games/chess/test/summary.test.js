// What goes to the chat when a game of chess ends: in the sender's language, who won and with
// which colour, how it ended and in how many moves, the series score when more than one game was
// played, and the game itself as PGN movetext (language-neutral, no tag pairs: nothing about who
// played).
import { describe, expect, it } from "vitest";
import { view } from "../../../kit/src/match.js";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { initial, play, result, turn } from "../src/rules.js";
import { how, summary } from "../src/summary.js";
import { TEXTS } from "../src/texts.js";

const rules = { initial, play, result, turn };
const translate = translator(joinTexts(KIT_TEXTS, TEXTS));
const SCHOLARS = "e2e4 e7e5 f1c4 b8c6 d1h5 g8f6 h5f7".split(" ");
const FOOLS = "f2f3 e7e5 g2g4 d8h4".split(" ");
const LOYD = "e2e3 a7a5 d1h5 a8a6 h5a5 h7h5 h2h4 a6h6 a5c7 f7f6 c7d7 e8f7 d7b7 d8d3 b7b8 d3h7 b8c8 f7g6 c8e6".split(" ");

/** What `me` sees of a match in which `first` started, after `moves`. */
function seen(moves, { me = "ann", first = "ann" } = {}) {
  const game = { a: "ann", b: "bob", first, toss: {}, moves, end: null };
  return view({ v: 1, id: "m", me, game, heard: moves.length, fork: null }, rules);
}

const say = (moves, options = {}, lang = "en") =>
  summary(seen(moves, options), { t: (key, vars) => translate(lang, key, vars), lang, name: translate(lang, "name"), icon: "♟️" });

describe("the result in the chat", () => {
  it("says who won with which colour, how and in how many moves, then the game", () => {
    expect(say(SCHOLARS)).toBe("♟️ Chess: I won (white) · Checkmate · moves: 4\n\n1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0");
    expect(say(SCHOLARS, { me: "bob" })).toBe("♟️ Chess: you won (white) · Checkmate · moves: 4\n\n1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0");
    expect(say(FOOLS)).toBe("♟️ Chess: you won (black) · Checkmate · moves: 2\n\n1. f3 e5 2. g4 Qh4# 0-1");
  });

  it("says a resignation and a draw by the rules for what they are", () => {
    expect(say(["e2e4", "e7e5", { x: "resign", by: "ann" }])).toBe("♟️ Chess: you won (black) · Resignation · moves: 1\n\n1. e4 e5 0-1");
    expect(say([{ x: "resign", by: "bob" }])).toBe("♟️ Chess: I won (white) · Resignation · moves: 0\n\n1-0");
    expect(say(LOYD)).toBe(
      "♟️ Chess: a draw · Stalemate · moves: 10\n\n" +
        "1. e3 a5 2. Qh5 Ra6 3. Qxa5 h5 4. h4 Rah6 5. Qxc7 f6 6. Qxd7+ Kf7 7. Qxb7 Qd3 8. Qxb8 Qh7 9. Qxc8 Kg6 10. Qe6 1/2-1/2",
    );
  });

  it("adds the series score after more than one game, and gives the last game's PGN", () => {
    // Ann starts the first game with white and mates; Bob starts the second with white, and Ann mates him.
    const moves = [...SCHOLARS, { x: "next" }, ...FOOLS];
    expect(say(moves)).toBe("♟️ Chess: I won (black) · Checkmate · moves: 2 · Score 2–0\n\n1. f3 e5 2. g4 Qh4# 0-1");
    expect(say([...moves, { x: "next" }, ...LOYD], { me: "bob" })).toMatch(/^♟️ Chess: a draw · Stalemate · moves: 10 · Score 0–2 · draws: 1\n\n1\. e3 /);
  });

  it("speaks the sender's language, numbers included; the PGN is the same in all", () => {
    expect(say(FOOLS, { me: "bob" }, "es")).toBe("♟️ Ajedrez: gané yo (negras) · Jaque mate · jugadas: 2\n\n1. f3 e5 2. g4 Qh4# 0-1");
    const n = new Intl.NumberFormat("ar").format(2);
    expect(say(FOOLS, { me: "bob" }, "ar")).toBe(`♟️ شطرنج: الفوز لي (الأسود) · كش مات · النقلات: ${n}\n\n1. f3 e5 2. g4 Qh4# 0-1`);
  });
});

describe("how a game ended, for the kit to show under the status", () => {
  it("is the reason in the user's language, and nothing for a game that did not end by the rules", () => {
    const es = (key, vars) => translate("es", key, vars);
    expect(how({ winner: 0, reason: "checkmate" }, es)).toBe("Jaque mate");
    expect(how({ winner: null, reason: "stalemate" }, (key) => translate("en", key))).toBe("Stalemate");
    expect(how({ winner: null, reason: "repetition" }, (key) => translate("en", key))).toBe("Threefold repetition");
    expect(how({ winner: null }, es)).toBe("");
    expect(how(null, es)).toBe("");
  });
});
