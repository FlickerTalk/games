import { describe, expect, it } from "vitest";
import { chooser } from "../src/chooser.js";
import { initial } from "../src/rules.js";
import { SIZES, apart, inside, keyed, painted, seat } from "./rig.js";

const choosing = (extra = {}) => ({ ...initial(), ...extra });
const at = (state = choosing(), options = {}) => seat(chooser, state, { me: 0, ...options });

describe("the home screen of Card Corner", () => {
  it("offers the four games as four large pictures to touch, apart and inside the board at every size", () => {
    for (const size of SIZES) {
      const tiles = chooser.buttons(at(choosing(), { size }));
      expect(tiles.map((one) => one.key)).toEqual(["pairs", "war", "rummy", "fish"]);
      expect(tiles.map((one) => one.label)).toEqual(["Pairs", "War", "Rummy", "Go Fish"]);
      for (const { box, disabled } of tiles) {
        expect(inside(box)).toBe(true);
        expect(box.w * size).toBeGreaterThanOrEqual(88);
        expect(disabled).toBe(false);
      }
      for (const [index, one] of tiles.entries()) for (const other of tiles.slice(index + 1)) expect(apart(one.box, other.box)).toBe(true);
    }
    expect(chooser.label(at())).toBe("Card Corner: Choose a game");
  });

  it("starts War, Rummy and Go Fish at a touch", () => {
    for (const [key, move] of [["war", "gw"], ["rummy", "gr"], ["fish", "gf"]]) {
      const seen = at();
      chooser.press(key, seen);
      expect(seen.ctx.play).toHaveBeenCalledWith(move);
    }
  });

  it("asks how many cards Pairs is played with, and lets the player go back to the other games", () => {
    const seen = at();
    chooser.press("pairs", seen);
    expect(seen.ctx.play).not.toHaveBeenCalled();
    expect(seen.local.sizing).toBe(true);
    const sizes = chooser.buttons(seen);
    expect(sizes.map((one) => one.key)).toEqual(["games", "p16", "p24"]);
    expect(sizes.map((one) => one.label)).toEqual(["Other games", "Pairs with 16 cards", "Pairs with 24 cards"]);
    for (const { box } of sizes) expect(box.w * 343).toBeGreaterThanOrEqual(44);
    chooser.press("p24", seen);
    expect(seen.ctx.play).toHaveBeenCalledWith("gp24");
    chooser.press("games", seen);
    expect(seen.local.sizing).toBe(false);
    expect(seen.wake).toHaveBeenCalled();
  });

  it("opens nothing while the other player chooses or the deck is being shuffled, and says so", () => {
    const waiting = at(choosing(), { me: 1 });
    expect(chooser.buttons(waiting).every((one) => one.disabled)).toBe(true);
    expect(chooser.label(waiting)).toBe("Card Corner: The other player is choosing the game");
    chooser.press("war", waiting);
    expect(waiting.ctx.play).not.toHaveBeenCalled();
    const shuffling = at(choosing({ phase: "shuffle", game: "rummy" }));
    expect(chooser.buttons(shuffling).every((one) => one.disabled)).toBe(true);
    expect(chooser.label(shuffling)).toBe("Card Corner, Rummy: Shuffling the deck…");
  });

  it("pictures each game with real cards and no words, the chosen one outlined while the deck is shuffled", () => {
    const plain = painted(chooser, at());
    expect(plain.pen.calls.some((call) => call.op === "fillText")).toBe(false);
    expect(plain.keys.filter((key) => key.startsWith("f")).length).toBeGreaterThanOrEqual(8);
    expect(plain.keys).toContain("back");
    expect(plain.pen.depth).toBe(0);
    const shuffling = painted(chooser, at(choosing({ phase: "shuffle", game: "rummy" })));
    expect(shuffling.pen.calls).not.toEqual(plain.pen.calls);
    const sizing = painted(chooser, at(choosing(), { local: { sizing: true } }));
    expect(sizing.keys.filter((key) => key === "back")).toHaveLength(40);
    expect(sizing.pen.calls.filter((call) => call.op === "fillText").map((call) => call.text)).toEqual(["16", "24"]);
  });
});
