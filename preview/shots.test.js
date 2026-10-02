// What `npm run shots` hands over for review: every game in a phone (360×740) light and dark, in
// Arabic right to left, and on a tablet in landscape (2560×1600), in the states that matter.
// @vitest-environment node
import { describe, expect, it } from "vitest";
import { CONFIGS, STATES, shotPath } from "./shots.js";

describe("the screenshots for review", () => {
  it("cover a phone light and dark, Arabic right to left, and a tablet in landscape", () => {
    const byName = Object.fromEntries(CONFIGS.map((config) => [config.name, config]));
    expect(byName["phone-light"]).toMatchObject({ device: { width: 360, height: 740 }, dark: false, lang: "en" });
    expect(byName["phone-dark"]).toMatchObject({ device: { width: 360, height: 740 }, dark: true });
    expect(byName["phone-ar"]).toMatchObject({ lang: "ar" });
    const tablet = byName["tablet-landscape"];
    expect(tablet.device.width * tablet.scale).toBe(2560);
    expect(tablet.device.height * tablet.scale).toBe(1600);
  });

  it("cover the list, waiting, a match on both sides, a win, a draw and the result", () => {
    for (const state of ["list-empty", "waiting", "not-open", "mid-match", "confirm-resign", "win", "draw", "result-sent", "list"]) expect(STATES).toContain(state);
  });

  it("are saved where the review looks for them", () => {
    expect(shotPath("tictactoe", "phone-dark", 4, "win", "b")).toBe("/private/tmp/ftgames-shots/tictactoe/phone-dark/04-win-b.png");
  });
});
