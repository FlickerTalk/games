// What `npm run shots` hands over for review: every game in a phone (360×740) light and dark, in
// Arabic right to left, and on a tablet in landscape (2560×1600), in the states that matter.
// @vitest-environment node
import { describe, expect, it } from "vitest";
import { CONFIGS, PLAYS, STATES, alternate, shotPath, touches } from "./shots.js";

describe("the screenshots for review", () => {
  it("cover a phone light and dark, Arabic right to left, and a tablet in landscape", () => {
    const byName = Object.fromEntries(CONFIGS.map((config) => [config.name, config]));
    expect(byName["phone-light"]).toMatchObject({ device: { width: 360, height: 740 }, dark: false, lang: "en" });
    expect(byName["phone-dark"]).toMatchObject({ device: { width: 360, height: 740 }, dark: true });
    expect(byName["phone-ar"]).toMatchObject({ lang: "ar" });
    const tablet = byName["tablet-landscape"];
    expect(tablet.device.width * tablet.scale).toBe(2560);
    expect(tablet.device.height * tablet.scale).toBe(1600);
    // The phone the room was measured on (Samsung S20+), with the longest texts, dark.
    expect(byName["phone-samsung"]).toMatchObject({ device: { width: 384, height: 853 }, dark: true, lang: "es" });
    expect(byName["phone-samsung-light"]).toMatchObject({ device: { width: 384, height: 853 }, dark: false, lang: "es" });
  });

  it("cover the list, waiting, a match on both sides, a win, a draw and the result", () => {
    for (const state of ["list-empty", "waiting", "not-open", "mid-match", "confirm-resign", "win", "draw", "result-sent", "list"]) expect(STATES).toContain(state);
  });

  it("end a round with as many moves as the game needs, the two sides taking turns from ⭕", () => {
    expect(alternate([1, 6], ["o", "x"])).toEqual([["o", 1], ["x", 6]]);
    expect(alternate([4, 3, 4, 3], ["o", "x"])).toEqual([["o", 4], ["x", 3], ["o", 4], ["x", 3]]);
  });

  it("touch what each game's move needs: one cell, or a piece and then its square", () => {
    expect(touches(PLAYS.tictactoe, 4)).toEqual(['[data-cell="4"]']);
    expect(touches(PLAYS.chess, "e2e4")).toEqual(['rect.square[data-square="e2"]', 'rect.square[data-square="e4"]']);
  });

  it("play lines that do what they claim: the starter wins the first round, the second is a draw (or, with no draw in the game, the same win)", async () => {
    for (const [game, plays] of Object.entries(PLAYS)) {
      const rules = await import(`../games/${game}/src/rules.js`);
      const after = (moves) => moves.reduce((state, move) => {
        const played = rules.play(state, move, rules.turn(state));
        if (played.error) throw new Error(`${game} ${move}: ${played.error}`);
        return played.state;
      }, rules.initial());
      expect(rules.result(after([...plays.opening, ...plays.winning])), game).toMatchObject({ winner: 0 });
      expect(rules.result(after(plays.opening)), game).toBeNull();
      if (plays.draw) expect(rules.result(after(plays.draw)), game).toMatchObject({ winner: null });
      else expect(rules.result(after([...plays.opening, ...plays.winning])), game).toMatchObject({ winner: 0 });
    }
    expect(typeof PLAYS.chess.scenes).toBe("function");
  });

  it("are saved where the review looks for them", () => {
    expect(shotPath("tictactoe", "phone-dark", 4, "win", "b")).toBe("/private/tmp/ftgames-shots/tictactoe/phone-dark/04-win-b.png");
  });
});
