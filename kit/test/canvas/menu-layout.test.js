import { describe, expect, it } from "vitest";
import { endLayout, homeLayout, looksLayout, pauseLayout, promptLayout } from "../../src/canvas/menu-layout.js";
import { SIZES, checkTargets } from "./sizes.js";

const check = (name, layout, width, height, fill) => checkTargets(layout.targets, { width, height, fill, name });

describe("the menus' layouts", () => {
  it("lay out the home screen: the player, the looks, each court, the rival and one big play button", () => {
    for (const [width, height, fill] of SIZES) {
      for (const rival of [false, true]) {
        const layout = homeLayout(width, height, { variants: ["main", "small", "big", "daily"], rival, fill });
        check("home", layout, width, height, fill);
        const kinds = layout.targets.map((target) => `${target.kind}:${target.value}`);
        for (const kind of ["avatar:avatar", "looks:looks", "play:play", "variant:main", "variant:small", "variant:big", "variant:daily", "speaker:speaker", "music:music"]) expect(kinds).toContain(kind);
        expect(kinds.includes("rival:rival")).toBe(rival);
      }
    }
  });

  it("lay out the end of a round: one big again button, the way home, and the gift when there is one", () => {
    for (const [width, height, fill] of SIZES) {
      for (const gift of [false, true]) {
        const layout = endLayout(width, height, { gift, fill });
        check("end", layout, width, height, fill);
        const kinds = layout.targets.map((target) => target.kind);
        expect(kinds.filter((kind) => kind === "again")).toHaveLength(1);
        expect(kinds).toContain("home");
        expect(kinds.includes("gift")).toBe(gift);
        expect(layout.card.w).toBeGreaterThan(200);
      }
    }
  });

  it("lay out the looks, one kind at a time, every look a tile of 88 or more", () => {
    for (const [width, height, fill] of SIZES) {
      for (const [kind, count] of [["court", 5], ["effect", 6]]) {
        const layout = looksLayout(width, height, { kind, count, fill, tabs: ["court", "effect"] });
        check("looks", layout, width, height, fill);
        expect(layout.targets.filter((target) => target.kind === "look")).toHaveLength(count);
        expect(layout.targets.filter((target) => target.kind === "tab").map((target) => target.value)).toEqual(["court", "effect"]);
      }
    }
  });

  it("lay out a tab for each kind of look a game gives, and none when it gives one kind", () => {
    for (const [width, height, fill] of SIZES) {
      const two = looksLayout(width, height, { kind: "car", count: 4, fill, tabs: ["car", "track"] });
      check("looks", two, width, height, fill);
      expect(two.targets.filter((target) => target.kind === "tab").map((target) => target.value)).toEqual(["car", "track"]);
      const one = looksLayout(width, height, { kind: "car", count: 4, fill, tabs: ["car"] });
      check("looks", one, width, height, fill);
      expect(one.targets.filter((target) => target.kind === "tab")).toEqual([]);
    }
  });

  it("lay out the pause and the friend's invitation over the court", () => {
    for (const [width, height, fill] of SIZES) {
      check("pause", pauseLayout(width, height, { fill }), width, height, fill);
      const prompt = promptLayout(width, height, { fill });
      check("prompt", prompt, width, height, fill);
      expect(prompt.targets.map((target) => target.kind).sort()).toEqual(["accept", "dismiss"]);
    }
  });
});
