import { describe, expect, it } from "vitest";
import { CORNER } from "../../src/canvas/layout.js";
import { endLayout, homeLayout, looksLayout, pauseLayout, promptLayout } from "../../src/canvas/menu-layout.js";

const SIZES = [[360, 588, true], [384, 801, true], [430, 880, true], [844, 338, true], [1280, 748, true], [384, 556, false], [360, 443, false], [360, 343, false], [1280, 503, false], [352, 556, false], [328, 443, false], [328, 343, false]];
const overlap = (one, two) => one.x < two.x + two.w && two.x < one.x + one.w && one.y < two.y + two.h && two.y < one.y + one.h;
const inside = (box, width, height) => box.x >= 0 && box.y >= 0 && box.x + box.w <= width + 0.5 && box.y + box.h <= height + 0.5;

function check(name, layout, width, height, fill) {
  const { targets } = layout;
  expect(targets.length, name).toBeGreaterThan(0);
  const corners = [{ x: 0, y: height - CORNER, w: CORNER, h: CORNER }, { x: width - CORNER, y: height - CORNER, w: CORNER, h: CORNER }];
  for (const target of targets) {
    const label = `${name} ${width}x${height} ${target.kind}:${target.value}`;
    expect(inside(target, width, height), label).toBe(true);
    const least = ["speaker", "music"].includes(target.kind) ? 48 : target.kind === "play" || target.kind === "again" || target.kind === "resume" ? 120 : 88;
    expect(Math.min(target.w, target.h), label).toBeGreaterThanOrEqual(least);
    if (fill) for (const corner of corners) expect(overlap(target, corner), label).toBe(false);
  }
  targets.forEach((one, at) => targets.slice(at + 1).forEach((two) => expect(overlap(one, two), `${name} ${width}x${height} ${one.kind}:${one.value} ${two.kind}:${two.value}`).toBe(false)));
}

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
        const layout = looksLayout(width, height, { kind, count, fill });
        check("looks", layout, width, height, fill);
        expect(layout.targets.filter((target) => target.kind === "look")).toHaveLength(count);
        expect(layout.targets.filter((target) => target.kind === "tab")).toHaveLength(2);
      }
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
