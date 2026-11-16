import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { phones } from "../../../kit/test/helpers.js";
import { labelFor } from "../src/labels.js";
import { canDive, canShoot } from "../src/rounds.js";
import { gameOn, memoryStore, press, swipe, tapGoal } from "./harness.js";

const AIM = { x: 0.12, y: 0.25 };
const FAR = { x: 0.9, y: 0.3 };

async function table() {
  const { a, b } = phones();
  const time = { now: 1000 };
  const sides = [];
  for (const core of [a, b]) {
    const made = gameOn(core.ft, { clock: () => time.now, store: memoryStore() });
    await made.game.open({ lang: "en", live: true, chat: core.chat });
    made.game.resize(384, 801, true);
    sides.push({ ...made, core });
  }
  const later = async (ms, each = () => {}) => {
    const end = time.now + ms;
    while (time.now < end) {
      time.now = Math.min(end, time.now + 50);
      for (const { game } of sides) {
        each(game);
        game.frame(time.now);
      }
      await vi.advanceTimersByTimeAsync(1);
      for (const { game } of sides) await game.idle();
      for (const { game } of sides) await game.friend.table.idle();
    }
  };
  return { one: sides[0], two: sides[1], later, time };
}

function act(game) {
  const { round } = game.state;
  if (game.state.screen !== "play" || !round?.kick) return;
  if (canShoot(round)) swipe(game, AIM);
  else if (canDive(round, game.now())) tapGoal(game, round.seat === 0 ? AIM : FAR);
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("two phones in the same chat", () => {
  it("say nothing when the game opens, and wait on the home screen", async () => {
    const { one, two, later } = await table();
    await later(500);
    expect(one.core.sent).toEqual([]);
    expect(two.core.sent).toEqual([]);
    expect(one.game.state.screen).toBe("home");
  });

  it("show the one who started waiting and the other invited, and start nothing by themselves", async () => {
    const { one, two, later } = await table();
    await press(one.game, "play");
    await later(600);
    expect(one.game.state.screen).toBe("play");
    expect(two.game.state.screen).toBe("home");
    expect(two.game.friend.status).toMatchObject({ here: true, invited: true });
    expect(labelFor({ kind: "rival" }, two.game.state, two.game.friend.status)).toBe("Your friend is here");
    await later(5000);
    expect(two.game.state.screen).toBe("home");
    await press(two.game, "play");
    await later(200);
    expect(two.game.state.screen).toBe("play");
    expect(one.game.state.round.seat + two.game.state.round.seat).toBe(1);
  });

  it("tell the player who started that nobody is there when the other does not have the game open", async () => {
    const { one, two, later } = await table();
    two.core.closed = true;
    await press(one.game, "play");
    await later(300);
    expect(one.game.state.screen).toBe("home");
    expect(one.game.friend.status.waiting).toBe(true);
    expect(labelFor({ kind: "play" }, one.game.state, one.game.friend.status)).toBe("Waiting for your friend");
    await vi.advanceTimersByTimeAsync(9000);
    await later(100);
    expect(one.game.friend.status.away).toBe(true);
    expect(labelFor({ kind: "rival" }, one.game.state, one.game.friend.status)).toBe("Your friend does not have the game open");
  });

  it("play a kick blind: the keeper picks a side before the shot is shown, then both watch the same kick", async () => {
    const { one, two, later } = await table();
    await press(one.game, "play");
    await later(600);
    await press(two.game, "play");
    await later(300);
    const [shooter, keeper] = one.game.state.round.seat === 0 ? [one.game, two.game] : [two.game, one.game];
    expect(shooter.state.round.kick.phase).toBe("aim");
    expect(keeper.state.round.kick.phase).toBe("wait");
    swipe(shooter, AIM);
    expect(shooter.state.round.kick.phase).toBe("wait");
    await later(300);
    expect(keeper.state.round.kick).toMatchObject({ phase: "guess", aim: null });
    expect(keeper.targets().map((target) => target.kind)).toContain("dive");
    tapGoal(keeper, FAR);
    expect(keeper.state.round.kick.guess).not.toBeNull();
    await later(600);
    for (const game of [shooter, keeper]) {
      expect(game.state.round.kick).toMatchObject({ phase: "fly", shooter: 0 });
      expect(game.state.round.kick.aim.x).toBeLessThan(0.2);
      expect(game.state.round.kick.dive.x).toBeGreaterThan(0.8);
    }
    await later(2500);
    for (const game of [shooter, keeper]) expect(game.state.round.kicks.map((kick) => kick.outcome)).toEqual(["goal"]);
    expect(keeper.state.round.kick.phase).toBe("aim");
  });

  it("play a whole shoot-out to the same result on both phones, each with its own star card, and the next round when both ask", { timeout: 60_000 }, async () => {
    const { one, two, later } = await table();
    await press(one.game, "play");
    await later(600);
    await press(two.game, "play");
    for (let tries = 0; tries < 60 && (one.game.state.screen !== "end" || two.game.state.screen !== "end"); tries += 1) await later(1000, act);
    expect(one.game.state.screen).toBe("end");
    expect(two.game.state.screen).toBe("end");
    const [first, second] = [one.game.state.outcome, two.game.state.outcome];
    expect(first.mine).toBe(second.theirs);
    expect(first.theirs).toBe(second.mine);
    expect(first.won).not.toBe(second.won);
    expect(one.game.state.round.kicks).toEqual(two.game.state.round.kicks);
    for (const side of [one, two]) expect(JSON.parse(side.store.kept.get("progress")).wins + JSON.parse(side.store.kept.get("progress")).losses).toBe(1);
    await press(one.game, "again");
    await later(400);
    expect(one.game.state).toMatchObject({ screen: "play" });
    expect(one.game.state.round).toMatchObject({ index: 1, kicks: [] });
    expect(two.game.state.screen).toBe("end");
    expect(two.game.friend.status.invited).toBe(true);
    await press(two.game, "again");
    await later(300);
    expect(two.game.state.round).toMatchObject({ index: 1, kicks: [] });
  });

  it("leave the match when the player goes home from the pause, and say so to the other phone", async () => {
    const { one, two, later } = await table();
    await press(one.game, "play");
    await later(600);
    await press(two.game, "play");
    await later(300);
    await press(one.game, "pause");
    await press(one.game, "home");
    await later(300);
    expect(one.game.state).toMatchObject({ screen: "home", round: null });
    expect(two.game.friend.status.away).toBe(true);
  });
});
