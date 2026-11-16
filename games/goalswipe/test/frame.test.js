import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { tokensFor } from "../../../kit/test/canvas/themes.js";
import { drawFrame } from "../src/frame.js";
import { FLIGHT } from "../src/moves.js";
import { THEME, themeFor } from "../src/theme.js";
import { makeGame, playWell, press, swipe, targetOf } from "./harness.js";

const frame = (game, time = 0.5, theme = THEME) => draw((ctx) => drawFrame(ctx, game, theme, time));

describe("a frame", () => {
  it("clears the canvas first and draws every screen, leaving the context as it found it", { timeout: 60_000 }, async () => {
    const { game, later } = await makeGame({ opening: { solo: true } });
    const seen = [];
    const look = () => {
      const ctx = frame(game);
      expect(ctx.calls[0].op).toBe("clearRect");
      expect(ctx.depth).toBe(0);
      expect(ctx.calls.length).toBeGreaterThan(20);
      seen.push(game.state.screen);
    };
    look();
    await press(game, "looks");
    look();
    await press(game, "tab", "field");
    look();
    await press(game, "done");
    await press(game, "avatar");
    look();
    await press(game, "profile", "ari");
    await press(game, "done");
    await press(game, "play");
    await later(50);
    look();
    swipe(game, { x: 0.2, y: 0.3 });
    await later(FLIGHT / 2);
    look();
    await press(game, "pause");
    look();
    await press(game, "resume");
    for (let tries = 0; tries < 40 && game.state.screen === "play"; tries += 1) {
      await later(3000, { each: playWell });
      frame(game, 0.5 + tries);
    }
    look();
    expect(seen).toEqual(["home", "looks", "looks", "avatar", "play", "play", "play", "end"]);
  });

  it("writes no words on the canvas: digits only, on every screen of a round", { timeout: 60_000 }, async () => {
    const { game, later } = await makeGame({ opening: { solo: true } });
    const words = () => frame(game).calls.filter((call) => call.op === "fillText" || call.op === "strokeText").map((call) => call.text);
    expect(words().join("")).toMatch(/^\d*$/);
    await press(game, "play");
    for (let tries = 0; tries < 40 && game.state.screen === "play"; tries += 1) {
      await later(3000, { each: playWell });
      expect(words().join("")).toMatch(/^\d*$/);
    }
    expect(game.state.screen).toBe("end");
    expect(words().join("")).toMatch(/^\d+$/);
  });

  it("draws the play screen inside the frame at the smallest room and on a phone held sideways, in every field", async () => {
    for (const [width, height, fill] of [[328, 343, false], [360, 343, false], [844, 338, true], [1280, 748, true]]) {
      const { game, later } = await makeGame({ opening: { solo: true }, width, height, fill });
      for (const field of ["school", "beach", "stadium"]) {
        game.state.progress = { ...game.state.progress, received: ["beach", "star", "stadium"], chosen: { ball: "star", field } };
        await press(game, targetOf(game, "play") ? "play" : "pause");
        await later(50);
        const box = bounds(painted(frame(game)).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y)));
        expect(box.left, `${width}x${height} ${field}`).toBeGreaterThanOrEqual(-60);
        expect(box.right, `${width}x${height} ${field}`).toBeLessThanOrEqual(width + 60);
        if (game.state.paused) await press(game, "home");
        else {
          await press(game, "pause");
          await press(game, "home");
        }
      }
    }
  });

  it("draws the pitch at dusk with a rim on a dark page", async () => {
    const { game, later } = await makeGame({ opening: { solo: true } });
    await press(game, "play");
    await later(50);
    const dark = themeFor(tokensFor("mono-dark"), { dark: true });
    const colours = new Set(frame(game, 0.5, dark).calls.filter((call) => call.op === "set" && ["fillStyle", "strokeStyle"].includes(call.name)).map((call) => call.value));
    expect(colours.has(dark.art.fields.school.ground)).toBe(true);
    expect(colours.has(dark.art.rim)).toBe(true);
    expect(colours.has(THEME.art.fields.school.sky)).toBe(false);
  });

  it("shows the other person's seat in a chat, and the two ways to play outside one", async () => {
    const friend = await makeGame({ opening: { live: true } });
    expect(frame(friend.game).calls.length).toBeGreaterThan(20);
    const alone = await makeGame({ opening: { chat: undefined } });
    expect(frame(alone.game).calls.length).toBeGreaterThan(frame(friend.game).calls.length / 2);
  });
});
