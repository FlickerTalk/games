import { describe, expect, it } from "vitest";
import { required } from "../src/geometry.js";
import { FREE_PAGES, PAGE_ORDER, pageOf } from "../src/pages.js";
import { choose, drag, makeGame, openPage, pagePoint, tap, tapZone, targetOf } from "./harness.js";

const kinds = (game) => [...new Set(game.targets().map((one) => one.kind))];

describe("Colour Corner's home", () => {
  it("offers colouring pages and free painting, the player's face, the gallery and a big play button", async () => {
    const { game } = await makeGame();
    expect(game.state.screen).toBe("home");
    expect(game.state.mode).toBe("alone");
    expect(kinds(game)).toEqual(expect.arrayContaining(["play", "variant", "avatar", "looks", "speaker", "music"]));
    expect(game.targets().filter((one) => one.kind === "variant").map((one) => one.value)).toEqual(["pages", "free"]);
  });

  it("adds colouring together and the other side's seat in a conversation with a friend or with FlickerTalk", async () => {
    for (const opening of [{ live: true }, { solo: true }]) {
      const { game } = await makeGame({ opening });
      expect(game.targets().filter((one) => one.kind === "variant").map((one) => one.value)).toEqual(["pages", "free", "together"]);
      expect(targetOf(game, "rival")).toBeDefined();
    }
  });

  it("remembers the chosen way to play", async () => {
    const { game, store } = await makeGame();
    await tap(game, "variant", "free");
    await game.idle();
    expect(JSON.parse(store.kept.get("colourcorner")).variant).toBe("free");
  });
});

describe("the shelf of pages", () => {
  it("shows every page, the first twelve open and the rest wrapped, and opens a page on a touch", async () => {
    const { game } = await makeGame();
    await tap(game, "variant", "pages");
    await tap(game, "play");
    expect(game.state.screen).toBe("shelf");
    const seen = [];
    for (let screens = 0; screens < 10; screens += 1) {
      seen.push(...game.targets().filter((one) => one.kind === "tile").map((one) => one.value));
      if (!targetOf(game, "next")) break;
      await tap(game, "next");
    }
    expect(seen).toEqual(PAGE_ORDER);
    while (targetOf(game, "prev")) await tap(game, "prev");
    await tap(game, "tile", "cat");
    expect(game.state.screen).toBe("page");
    expect(game.state.page).toBe("cat");
  });

  it("shakes a wrapped page and leaves it shut", async () => {
    const { game, sound } = await makeGame();
    await openPage(game, PAGE_ORDER[FREE_PAGES]);
    expect(game.state.screen).toBe("shelf");
    expect(game.state.moments.some((one) => one.kind === "shake")).toBe(true);
    expect(sound.play).toHaveBeenCalledWith("error-soft");
  });

  it("goes back home", async () => {
    const { game } = await makeGame();
    await tap(game, "play");
    await tap(game, "back");
    expect(game.state.screen).toBe("home");
  });
});

describe("colouring a page", () => {
  it("fills a zone with the chosen paint, spreading from the finger, with a soft tick, and keeps it", async () => {
    const { game, store, sound } = await makeGame();
    await openPage(game, "cat");
    await choose(game, "paint", 8);
    expect(game.state.colour).toBe(8);
    const zone = required(pageOf("cat"))[0];
    await tapZone(game, zone);
    expect(game.state.work.fills[zone]).toBe("8");
    expect(game.state.spreads.some((one) => one.zone === zone)).toBe(true);
    expect(sound.play).toHaveBeenCalledWith("tick", expect.anything());
    await game.idle();
    expect(JSON.parse(store.kept.get("page/cat")).fills[zone]).toBe("8");
  });

  it("fills with a pattern drawn in the chosen colour", async () => {
    const { game } = await makeGame();
    await openPage(game, "flower");
    await choose(game, "paint", 3);
    await choose(game, "pattern", "stars");
    await tapZone(game, required(pageOf("flower"))[2]);
    expect(game.state.work.fills[required(pageOf("flower"))[2]]).toBe("t3");
  });

  it("shows the hand on the first page until the first zone is filled, then never again", async () => {
    const { game, store } = await makeGame();
    await openPage(game, "cat");
    expect(game.state.taught).toBe(false);
    await tapZone(game, required(pageOf("cat"))[3]);
    expect(game.state.taught).toBe(true);
    await game.idle();
    expect(JSON.parse(store.kept.get("colourcorner")).taught).toBe(true);
  });

  it("takes a fill back with undo, one step at a time", async () => {
    const { game } = await makeGame();
    await openPage(game, "cat");
    const [one, two] = required(pageOf("cat"));
    await tapZone(game, one);
    await tapZone(game, two);
    await tap(game, "undo");
    expect(Object.keys(game.state.work.fills)).toEqual([String(one)]);
    await tap(game, "undo");
    expect(game.state.work.fills).toEqual({});
  });

  it("paints freely with the brush, and the eraser rubs the line out or clears a zone", async () => {
    const { game } = await makeGame();
    await openPage(game, "castle");
    await tap(game, "tool", "brush");
    await drag(game, [pagePoint(game, 40, 40), pagePoint(game, 80, 60), pagePoint(game, 120, 40)]);
    expect(game.state.work.items).toHaveLength(1);
    expect(game.state.work.items[0].pts.length).toBeGreaterThanOrEqual(6);
    await tap(game, "tool", "eraser");
    await drag(game, [pagePoint(game, 80, 60), pagePoint(game, 82, 62)]);
    expect(game.state.work.items).toHaveLength(0);
    await tap(game, "tool", "fill");
    const zone = required(pageOf("castle"))[4];
    await tapZone(game, zone);
    await tap(game, "tool", "eraser");
    await tapZone(game, zone);
    expect(game.state.work.fills[zone]).toBeUndefined();
  });

  it("scrolls the paints with a finger without choosing one, and chooses with a tap", async () => {
    const { game } = await makeGame();
    await openPage(game, "cat");
    const strip = game.state.layout.strips.find((one) => one.id === "paints");
    const start = { x: strip.x + strip.w - 50, y: strip.y + 40 };
    const before = game.state.colour;
    await drag(game, [start, { x: start.x - 60, y: start.y }, { x: start.x - 200, y: start.y }]);
    expect(game.state.scroll.paints).toBeGreaterThan(0);
    expect(game.state.colour).toBe(before);
  });

  it("names every zone for a screen reader, and fills one from the keyboard", async () => {
    const { game } = await makeGame();
    await openPage(game, "cat");
    const zones = game.targets().filter((one) => one.kind === "zone");
    expect(zones).toHaveLength(required(pageOf("cat")).length);
    game.press(zones[0]);
    await game.idle();
    expect(game.state.work.fills[zones[0].value]).toBeDefined();
  });

  it("comes back to the shelf with the page as it was left", async () => {
    const { game } = await makeGame();
    await openPage(game, "cat");
    await tapZone(game, required(pageOf("cat"))[0]);
    await tap(game, "back");
    expect(game.state.screen).toBe("shelf");
    await tap(game, "tile", "cat");
    expect(Object.keys(game.state.work.fills)).toHaveLength(1);
  });
});
