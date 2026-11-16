import { describe, expect, it } from "vitest";
import { draw, shapes } from "../../../kit/test/canvas/recorder.js";
import { THEME } from "../src/theme.js";
import { drawFrame } from "../src/frame.js";
import { stageArea } from "../src/home-art.js";
import { labelFor } from "../src/labels.js";
import { TEXTS } from "../src/texts.js";
import { makeGame, press, targetOf } from "./harness.js";

const frame = (game) => draw((pen) => drawFrame(pen, game, THEME, 1));
const arcs = (game) => frame(game).calls.filter((call) => call.op === "arc").length;

describe("the home screen", () => {
  it("is the chosen place behind the player's choices, at every size, with nothing but the kit's cards over it", async () => {
    for (const [width, height, fill] of [[384, 801, true], [360, 343, false], [844, 338, true], [1280, 748, true]]) {
      for (const opening of [{ solo: true }, { live: true }, { chat: undefined }]) {
        const { game } = await makeGame({ opening, width, height, fill });
        const ctx = frame(game);
        const first = ctx.calls.find((call) => call.op === "fillRect");
        expect(first.points, `${width}x${height}`).toEqual([[0, 0], [width, height]]);
        expect(ctx.depth).toBe(0);
      }
    }
  });

  it("stands the two knights in the widest free band of a tall screen, clear of every button", async () => {
    const { game } = await makeGame({ opening: { solo: true } });
    const band = stageArea(game.state, game.targets());
    expect(band.h).toBeGreaterThan(100);
    for (const target of game.targets()) expect(target.y + target.h <= band.y || target.y >= band.y + band.h, target.kind).toBe(true);
  });

  it("offers Flick or two players on this phone outside a chat, the chosen one marked by the kit", async () => {
    const { game } = await makeGame({ opening: { chat: undefined } });
    const card = (value) => {
      const { x, y, w, h } = targetOf(game, "variant", value);
      const inside = (call) => call.points.length > 0 && call.points.every(([px, py]) => px >= x && px <= x + w && py >= y && py <= y + h);
      return frame(game).calls.filter(inside).length;
    };
    for (const value of ["flick", "pair"]) expect(card(value), value).toBeGreaterThan(8);
    const before = shapes(frame(game)).join("|");
    await press(game, "variant", "pair");
    expect(game.state.variant).toBe("pair");
    expect(shapes(frame(game)).join("|")).not.toBe(before);
  });

  it("shows the player waiting on the play button once they started a round with the other person, and names it so", async () => {
    const { game } = await makeGame({ opening: { live: true } });
    const before = arcs(game);
    expect(labelFor(targetOf(game, "play"), game.state, game.duel.status)).toBe(TEXTS.en.play);
    await press(game, "play");
    expect(game.state.screen).toBe("home");
    expect(arcs(game)).toBeGreaterThanOrEqual(before + 6);
    expect(labelFor(targetOf(game, "play"), game.state, game.duel.status)).toBe(TEXTS.en.waiting);
  });

  it("shows the swords and the places to choose from on two tabs, the ones not received yet as wrapped gifts", async () => {
    const { game } = await makeGame({ opening: { solo: true } });
    await press(game, "looks");
    const swords = frame(game);
    game.state.progress = { ...game.state.progress, received: ["pillows", "wavy", "treehouse", "long"] };
    expect(frame(game).calls.length).not.toBe(swords.calls.length);
    await press(game, "tab", "scenery");
    expect(shapes(frame(game)).join("|")).not.toBe(shapes(swords).join("|"));
    expect(frame(game).depth).toBe(0);
  });
});
