import { describe, expect, it } from "vitest";
import { OUT_SHOW } from "../src/craft.js";
import { COUNTDOWN, END_PAUSE, leftOf } from "../src/rounds.js";
import { makeGame, memoryStore, press } from "./harness.js";

describe("a round on this phone", () => {
  it("lasts as long as its level says, its time line running down, and waits a moment before the card", async () => {
    const { game, later } = await makeGame({ opening: { solo: true } });
    await press(game, "play");
    const { round } = game.state;
    round.mind = null;
    expect(round.settings).toMatchObject({ level: 1, seconds: 35, twists: 0, place: "morning" });
    expect(leftOf(round)).toBe(1);
    await later(COUNTDOWN + 3500);
    expect(leftOf(round)).toBeGreaterThan(0.85);
    expect(leftOf(round)).toBeLessThan(0.95);
    round.match.roundSteps = round.match.step + 10;
    await later(300);
    expect(round.match.over).toBe(true);
    expect(game.state.screen).toBe("play");
    await later(END_PAUSE + 100);
    expect(game.state.screen).toBe("end");
    expect(game.state.outcome).toMatchObject({ mine: 0, theirs: 0, won: false, stars: 1 });
  });

  it("gives Flick another aircraft of the family the player flies, in another colour", async () => {
    const { game } = await makeGame({ opening: { solo: true } });
    await press(game, "looks");
    await press(game, "tab", "helicopter");
    await press(game, "look", 0);
    await press(game, "done");
    await press(game, "play");
    const { round } = game.state;
    expect(round.looks).toEqual([{ craft: "bubble", colour: "sunny" }, { craft: "tandem", colour: "lilac" }]);
    expect(round.match.crafts.map((one) => one.family)).toEqual(["helicopter", "helicopter"]);
  });

  it("ends early, with three stars and confetti, once Flick has lost its three balloons and floated away", async () => {
    const { game, later, sound } = await makeGame({ opening: { solo: true } });
    await press(game, "play");
    await later(COUNTDOWN + 200);
    const { round } = game.state;
    round.mind = null;
    Object.assign(round.match.crafts[1], { lost: 3, out: 1 });
    await later((OUT_SHOW * 1000) / 120 + END_PAUSE + 300);
    expect(game.state.screen).toBe("end");
    expect(game.state.outcome).toMatchObject({ mine: 3, theirs: 0, won: true, stars: 3 });
    expect(leftOf(round)).toBeGreaterThan(0.8);
    expect(game.state.moments.some((one) => one.kind === "confetti")).toBe(true);
    expect(sound.play.mock.calls.map(([name]) => name)).toContain("win");
  });

  it("sounds a pop, and the player's success when the popped balloon is the other's", async () => {
    const { game, later, sound } = await makeGame({ opening: { solo: true } });
    await press(game, "play");
    await later(COUNTDOWN + 100);
    const { round } = game.state;
    round.mind = null;
    const [mine, flick] = round.match.crafts;
    Object.assign(flick, { x: 0.5, y: 0.6, hx: 0, hy: -1 });
    Object.assign(mine, { x: 0.5, y: 0.8, hx: 0, hy: -1 });
    await later(1200);
    expect(flick.lost).toBe(1);
    const played = sound.play.mock.calls.map(([name]) => name);
    expect(played).toEqual(expect.arrayContaining(["pop", "success"]));
    expect(game.state.moments.find((one) => one.kind === "pop")).toMatchObject({ seat: 1, by: 0, left: 2 });
  });

  it("flies the aircraft just received as a gift, and remembers it", async () => {
    const store = memoryStore();
    const { game, later } = await makeGame({ opening: { solo: true }, store });
    game.state.progress = { ...game.state.progress, wins: 4, level: 5 };
    for (let rounds = 0; rounds < 4 && !game.state.outcome?.gift; rounds += 1) {
      await press(game, game.state.screen === "end" ? "again" : "play");
      await later(COUNTDOWN + 200);
      game.state.round.mind = null;
      Object.assign(game.state.round.match.crafts[1], { lost: 3, out: 1 });
      await later((OUT_SHOW * 1000) / 120 + END_PAUSE + 300);
    }
    const { gift } = game.state.outcome;
    expect(["seaplane", "rescue"]).toContain(gift);
    expect(game.state.flying).toBe(gift === "rescue" ? "helicopter" : "plane");
    await game.idle();
    expect(JSON.parse(store.kept.get("skychase")).flying).toBe(game.state.flying);
    await press(game, "gift");
    expect(game.state.outcome.opened).toBe(true);
  });
});
