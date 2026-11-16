import { describe, expect, it } from "vitest";
import { required } from "../src/geometry.js";
import { pageOf } from "../src/pages.js";
import { makeGame, tap, tapZone, targetOf } from "./harness.js";

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function until(game, done, ms = 8000) {
  for (let waited = 0; waited < ms && !done(); waited += 20) {
    await pause(20);
    await game.idle();
  }
}

describe("colouring one page together with Flick", () => {
  it("takes turns on the same page until it is full, then hangs it on the wall, never touching the live channel", async () => {
    const { game, core, later } = await makeGame({ opening: { solo: true }, timing: { think: 20 } });
    await tap(game, "variant", "together");
    await tap(game, "play");
    await until(game, () => ["shelf", "duo"].includes(game.state.screen) && (game.state.screen === "shelf" || game.state.page));
    if (game.state.screen === "shelf") await tap(game, "tile", "flower");
    await until(game, () => game.state.screen === "duo" && game.state.page);
    const page = pageOf(game.state.page);
    let theirs = 0;
    for (let turns = 0; turns < 80 && game.state.screen === "duo"; turns += 1) {
      await until(game, () => game.duo.status.myTurn || game.duo.status.phase !== "play");
      if (game.duo.status.phase !== "play") break;
      expect(targetOf(game, "zone")).toBeDefined();
      const zone = required(page).find((one) => game.duo.status.state.fills[one] === undefined);
      await tapZone(game, zone);
      await game.idle();
      theirs += game.state.spreads.filter((one) => one.by === "them").length ? 1 : 0;
      await later(0);
    }
    await later(1500);
    expect(game.state.screen).toBe("picture");
    expect(game.state.picture.kind).toBe("shared");
    expect(game.state.wall[0]).toBe("s:0");
    expect(theirs).toBeGreaterThan(0);
    expect(core.ft.live.send).not.toHaveBeenCalled();
    await tap(game, "play");
    await until(game, () => game.state.screen !== "picture");
    expect(["shelf", "duo"]).toContain(game.state.screen);
  }, 60_000);

  it("shows Flick thinking while it is Flick's turn, and keeps the paints out of reach until it has painted", async () => {
    const { game } = await makeGame({ opening: { solo: true }, timing: { think: 400 } });
    await tap(game, "variant", "together");
    await tap(game, "play");
    await until(game, () => game.state.screen === "duo" || game.state.screen === "shelf");
    if (game.state.screen === "shelf") await tap(game, "tile", "cat");
    await until(game, () => game.state.screen === "duo" && game.duo.status.myTurn);
    const zone = required(pageOf(game.state.page)).find((one) => game.duo.status.state.fills[one] === undefined);
    await tapZone(game, zone);
    expect(game.duo.status.myTurn).toBe(false);
    expect(targetOf(game, "zone")).toBeUndefined();
    expect(game.resting()).toBe(false);
  }, 60_000);
});
