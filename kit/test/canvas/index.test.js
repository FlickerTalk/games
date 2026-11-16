import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as canvas from "../../src/canvas/index.js";

const GAMES = join(import.meta.dirname, "..", "..", "..", "games");

describe("the canvas kit", () => {
  it("offers a new game everything it builds on, from one module", () => {
    const names = [
      "defineCanvasGame", "roomHeight", "readTokens", "themeFromTokens", "FALLBACK_TOKENS", "softDay", "softStage", "contrastOf",
      "box", "centreOf", "within", "overlap", "row", "grid", "span", "CORNER",
      "homeLayout", "endLayout", "looksLayout", "pauseLayout", "promptLayout", "barLayout",
      "pen", "drawGlyph", "drawRoundButton", "drawMark", "GLYPHS",
      "drawTopBar", "drawStar", "drawStarProgress", "drawPortrait", "drawVolumeLine", "drawSoundButtons", "drawDigits", "formatNumber",
      "drawHome", "drawRoundEnd", "drawLooks", "drawPresent", "drawPause", "drawPrompt", "drawHintHand", "drawCard",
      "pressTargets", "volumePointer", "foldWhenIdle", "soundState",
      "seedOf", "randomOf", "isSeed", "SameRounds", "sameRoundRules", "localFlick", "playMode", "chooseLook",
    ];
    for (const name of names) expect(canvas[name], name).toBeDefined();
    expect(typeof canvas.pen.roundedRect).toBe("function");
  });

  it("lets a player choose only a look they own", () => {
    const progress = { owned: (record) => record.received, choose: (record, look) => ({ ...record, chosen: look }) };
    expect(canvas.chooseLook(progress, { received: ["a"], chosen: null }, "a")).toEqual({ record: { received: ["a"], chosen: "a" }, owned: true });
    expect(canvas.chooseLook(progress, { received: ["a"], chosen: null }, "b")).toEqual({ record: { received: ["a"], chosen: null }, owned: false });
  });

  it("is in no board game's package", () => {
    for (const game of readdirSync(GAMES).filter((name) => !["tilecourt", "paddlepop"].includes(name))) {
      expect(readFileSync(join(GAMES, game, "dist", "index.js"), "utf8"), game).not.toContain("ftc-a11y");
    }
  });
});
