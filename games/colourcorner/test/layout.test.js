import { describe, expect, it } from "vitest";
import { CORNER, overlap } from "../../../kit/src/canvas/layout.js";
import { SIZES, checkTargets, inside } from "../../../kit/test/canvas/sizes.js";
import { TILE, gridLayout, pictureLayout, screenLayout, snapScroll, stripMost, stripTargets } from "../src/layout.js";

const items = (kind, count) => Array.from({ length: count }, (_, at) => ({ kind, value: at }));
const SCREENS = {
  page: { left: ["back", "undo"], tools: items("tool", 3), paints: items("paint", 29) },
  free: { left: ["back", "undo", "done"], tools: items("tool", 14), paints: items("paint", 24) },
  together: { left: ["back"], rival: true, tools: [], paints: items("paint", 29) },
};
const BAR = new Set(["back", "undo", "done", "speaker", "music", "rival", "prev", "next", "home"]);
const least = (target) => (BAR.has(target.kind) ? 48 : target.kind === "play" ? 120 : TILE);

function touchable(layout) {
  const strips = layout.strips.flatMap((strip) => stripTargets(strip, 0).filter((one) => one.visible));
  return [...layout.buttons, ...strips];
}

describe("the colouring screen", () => {
  it("keeps every button inside the frame, large enough, apart from the others and out of the bottom corners", () => {
    for (const [screen, options] of Object.entries(SCREENS)) {
      for (const [width, height, fill] of SIZES) checkTargets(touchable(screenLayout(width, height, { fill, ...options })), { width, height, fill, name: screen, least });
    }
  });

  it("gives the page the room the controls leave, never under them", () => {
    for (const [screen, options] of Object.entries(SCREENS)) {
      for (const [width, height, fill] of SIZES) {
        const layout = screenLayout(width, height, { fill, ...options });
        const name = `${screen} ${width}x${height}`;
        expect(inside(layout.page, width, height), name).toBe(true);
        for (const one of touchable(layout)) expect(overlap(one, layout.page), `${name} ${one.kind}`).toBe(false);
        expect(Math.abs(layout.page.w / layout.page.h - 300 / 360), name).toBeLessThan(0.01);
        expect(layout.page.scale, name).toBeCloseTo(layout.page.w / 300, 5);
      }
    }
  });

  it("makes the page as large as each frame allows, from a small phone's room to a tablet", () => {
    const scale = (width, height, fill) => screenLayout(width, height, { fill, ...SCREENS.page }).page.scale;
    expect(scale(384, 801, true)).toBeGreaterThanOrEqual(1.15);
    expect(scale(384, 556, false)).toBeGreaterThanOrEqual(0.85);
    expect(scale(360, 343, false)).toBeGreaterThanOrEqual(0.6);
    expect(scale(844, 338, true)).toBeGreaterThanOrEqual(0.6);
    expect(scale(1280, 748, true)).toBeGreaterThanOrEqual(1.6);
  });

  it("keeps the tools apart from the paints wherever there is room for both", () => {
    for (const [width, height, fill] of [[384, 801, true], [384, 556, false], [1280, 748, true], [844, 338, true]]) {
      expect(screenLayout(width, height, { fill, ...SCREENS.page }).strips.map((strip) => strip.items.length), `${width}x${height}`).toEqual([3, 29]);
    }
  });

  it("puts the way back on the left of the bar and the sound on its right, the rival's face between them", () => {
    const layout = screenLayout(384, 801, { fill: true, ...SCREENS.together });
    const at = (kind) => layout.buttons.find((one) => one.kind === kind);
    expect(at("back").x).toBeLessThan(at("rival").x);
    expect(at("rival").x).toBeLessThan(at("speaker").x);
    expect(at("speaker").x).toBeLessThan(at("music").x);
    expect(layout.portraits.me.x).toBeLessThan(layout.portraits.rival.x);
    expect(at("undo")).toBeUndefined();
  });
});

describe("a strip of tools or paints", () => {
  const strip = screenLayout(384, 801, { fill: true, ...SCREENS.page }).strips[1];

  it("scrolls along its length, offering only the items wholly in sight to a finger", () => {
    const shown = stripTargets(strip, 0);
    expect(shown).toHaveLength(29);
    expect(shown.filter((one) => one.visible).length).toBeGreaterThanOrEqual(3);
    for (const one of shown.filter((item) => item.visible)) expect(one.x >= strip.x && one.x + one.w <= strip.x + strip.w + 0.5).toBe(true);
    const later = stripTargets(strip, stripMost(strip));
    expect(later.at(-1).visible).toBe(true);
    expect(later[0].visible).toBe(false);
  });

  it("settles on a whole item after a drag", () => {
    expect(snapScroll(strip, 10)).toBe(0);
    expect(snapScroll(strip, 60)).toBe(TILE + 8);
    expect(snapScroll(strip, -50)).toBe(0);
    expect(snapScroll(strip, 1e6)).toBe(stripMost(strip));
  });

  it("centres a short strip that does not need to scroll", () => {
    const tools = screenLayout(384, 801, { fill: true, ...SCREENS.page }).strips[0];
    expect(stripMost(tools)).toBe(0);
    const shown = stripTargets(tools, 0);
    expect(shown.every((one) => one.visible)).toBe(true);
  });
});

describe("the shelf of pages and the wall of pictures", () => {
  it("show as many tiles as fit, at least 88 across, and page through the rest", () => {
    for (const [width, height, fill] of SIZES) {
      const layout = gridLayout(width, height, { fill, count: 17, page: 0 });
      const name = `${width}x${height}`;
      checkTargets([...layout.buttons, ...layout.tiles], { width, height, fill, name, least });
      expect(layout.tiles.length, name).toBeGreaterThanOrEqual(Math.min(17, 4));
      expect(layout.pages, name).toBe(Math.ceil(17 / layout.perPage));
    }
    expect(gridLayout(1280, 748, { fill: true, count: 17, page: 0 }).pages).toBe(1);
  });

  it("offers the next screen of tiles only when there is one", () => {
    const first = gridLayout(384, 556, { count: 17, page: 0 });
    expect(first.buttons.map((one) => one.kind)).toContain("next");
    expect(first.buttons.map((one) => one.kind)).not.toContain("prev");
    const last = gridLayout(384, 556, { count: 17, page: first.pages - 1 });
    expect(last.buttons.map((one) => one.kind)).toContain("prev");
    expect(last.tiles.map((tile) => tile.value).at(-1)).toBe(16);
  });
});

describe("a finished picture", () => {
  it("shows the picture large, with keep colouring, send, colour another and a gift waiting", () => {
    for (const [width, height, fill] of SIZES) {
      const layout = pictureLayout(width, height, { fill, actions: ["edit", "send"], gift: true });
      const name = `${width}x${height}`;
      checkTargets(layout.buttons, { width, height, fill, name, least });
      expect(inside(layout.picture, width, height), name).toBe(true);
      for (const one of layout.buttons) expect(overlap(one, layout.picture) && one.kind !== "gift", `${name} ${one.kind}`).toBe(false);
      expect(layout.buttons.map((one) => one.kind).sort()).toEqual(["edit", "gift", "home", "music", "play", "send", "speaker"]);
    }
  });
});

describe("a frame too small for anything", () => {
  it("still gives a page and its strips rather than nothing", () => {
    for (const [width, height] of [[0, 0], [100, 120]]) {
      const layout = screenLayout(width, height, SCREENS.page);
      expect(layout.page.scale).toBeGreaterThanOrEqual(0);
      expect(layout.strips.length).toBeGreaterThan(0);
    }
    expect(CORNER).toBe(40);
  });
});
