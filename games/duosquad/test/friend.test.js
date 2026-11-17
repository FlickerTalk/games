import { describe, expect, it } from "vitest";
import { liveWorld } from "../../../kit/test/duel/world.js";
import { fromBase64 } from "../../../kit/src/envelope.js";
import { TICK_LIMIT } from "../../../kit/src/live/wire.js";
import { CAUGHT_MOST } from "../src/crafts.js";
import { COUNTDOWN } from "../src/rounds.js";
import { chase, gameOn, mate, mine, press, steerTo } from "./harness.js";

const decode = (data) => JSON.parse(new TextDecoder().decode(fromBase64(data)));

async function twoPhones({ latency = 40, worlds = ["space", "space"] } = {}) {
  const w = liveWorld({ latency, make: (phone, { clock }) => gameOn(phone.core.ft, { clock, seed: phone.name === "a" ? 3 : 11 }) });
  for (const [at, name] of ["a", "b"].entries()) {
    const { game } = w.phones[name].made;
    await game.open({ lang: "en", live: true, chat: w.phones[name].core.chat });
    game.resize(at ? 360 : 384, at ? 588 : 801, true);
    game.state.world = worlds[at];
  }
  const game = (name) => w.phones[name].made.game;
  const frames = (each = () => {}) => (phone, now) => {
    each(phone.made.game);
    phone.made.game.frame(now);
  };
  return { w, game, frames };
}

async function bothPlaying(t, each) {
  await press(t.game("a"), "play");
  await t.w.pass(300, t.frames(each));
  await press(t.game("b"), "play");
  await t.w.pass(COUNTDOWN + 400, t.frames(each));
}

const totals = (t) => ["a", "b"].map((name) => t.game(name).state.round.tally.total);
const ticks = (t) => [...t.w.phones.a.core.sent, ...t.w.phones.b.core.sent].map((data) => fromBase64(data).length);

function expectSameEnd(t) {
  const [a, b] = [t.game("a"), t.game("b")];
  expect([a.state.screen, b.state.screen]).toEqual(["end", "end"]);
  expect(a.state.outcome.score).toBe(b.state.outcome.score);
  expect(a.state.outcome.mine).toBe(b.state.outcome.theirs);
  expect(a.state.outcome.theirs).toBe(b.state.outcome.mine);
  expect(a.state.outcome.cleared).toBe(b.state.outcome.cleared);
  expect(a.state.outcome.stars).toBe(b.state.outcome.stars);
  expect(a.state.outcome.won).toBe(b.state.outcome.won);
}

describe("a round with the other person in the chat", () => {
  it("sends nothing until the player taps play, then waits for the other, who sees this player ready", async () => {
    const t = await twoPhones();
    await t.w.pass(1000, t.frames());
    expect(t.w.phones.a.core.ft.live.send).not.toHaveBeenCalled();
    await press(t.game("a"), "play");
    expect(decode(t.w.phones.a.core.sent[0]).k).toBe("hello");
    await t.w.pass(300, t.frames());
    expect(t.game("a").state.screen).toBe("home");
    expect(t.game("b").duel.status).toMatchObject({ here: true, ready: { them: true, me: false } });
  });

  it("starts on both phones only once both are ready, with the same waves from the session and no tick during the countdown", async () => {
    const t = await twoPhones();
    await press(t.game("a"), "play");
    await t.w.pass(300, t.frames());
    await press(t.game("b"), "play");
    await t.w.pass(COUNTDOWN - 500, t.frames());
    const said = [...t.w.phones.a.core.sent, ...t.w.phones.b.core.sent].map((data) => decode(data).k);
    expect(said).not.toContain("tick");
    await t.w.pass(900, t.frames());
    const [a, b] = [t.game("a"), t.game("b")];
    expect([a.state.screen, b.state.screen]).toEqual(["play", "play"]);
    expect(a.state.round.seat + b.state.round.seat).toBe(1);
    expect(a.state.round.schedule).toEqual(b.state.round.schedule);
    expect(a.state.round.settings).toEqual(b.state.round.settings);
    expect(a.state.round.step).toBeGreaterThan(0);
  });

  it("shows each player's own craft where they steer it and the teammate's where the other phone says", async () => {
    const t = await twoPhones();
    await bothPlaying(t);
    const [a, b] = [t.game("a"), t.game("b")];
    steerTo(a, 0.15);
    steerTo(b, 0.85);
    await t.w.pass(1500, t.frames());
    expect(mine(a).u).toBeCloseTo(0.15, 2);
    expect(mate(b).u).toBeCloseTo(0.15, 2);
    expect(mine(b).u).toBeCloseTo(0.85, 2);
    expect(mate(a).u).toBeCloseTo(0.85, 2);
    expect(a.state.round.crafts[a.state.round.seat]).toBe(mine(a));
  });

  it("takes an enemy popped on one phone away on the other, counted for whoever popped it, in one shared score", async () => {
    const t = await twoPhones();
    const only = (game) => (game === t.game("a") ? chase(game) : game.state.round && steerTo(game, mine(game).seat ? 0.94 : 0.06));
    await bothPlaying(t, only);
    await t.w.pass(4000, t.frames(only));
    const [a, b] = [t.game("a"), t.game("b")];
    await press(a, "pause");
    await t.w.pass(400, t.frames());
    const popped = [...a.state.round.tally.pops].filter(([, pop]) => pop.seat === a.state.round.seat);
    expect(popped.length).toBeGreaterThan(0);
    for (const [id, pop] of popped) expect(b.state.round.tally.pops.get(id)).toEqual(pop);
    expect(b.onShow().enemies.some((one) => one.enemy.id === popped[0][0])).toBe(false);
    expect(b.state.moments.some((one) => one.kind === "pop" && one.by === a.state.round.seat) || b.state.round.tally.pops.size > 0).toBe(true);
    expect(totals(t)[0]).toBe(totals(t)[1]);
  });

  it("lets only the caught player's phone say it is caught, and frees it when the teammate flies over", async () => {
    const t = await twoPhones({ latency: 80 });
    await bothPlaying(t);
    const [a, b] = [t.game("a"), t.game("b")];
    steerTo(a, 0.2);
    steerTo(b, 0.8);
    await t.w.pass(1200, t.frames());
    mine(a).caught = CAUGHT_MOST;
    await t.w.pass(500, t.frames());
    expect(mate(b).caught).toBeGreaterThan(0);
    expect(b.state.moments.some((one) => one.kind === "caught" && one.seat === a.state.round.seat)).toBe(true);
    expect(mine(a).caught).toBeGreaterThan(0);
    steerTo(b, 0.2);
    await t.w.pass(1500, t.frames());
    expect(mine(a).caught).toBe(0);
    expect(mate(b).caught).toBe(0);
    expect(b.state.taught).toContain("free");
  });

  for (const latency of [20, 90, 180, 350]) {
    it(`plays a whole round to the same shared score and stars on both phones with ${latency} ms between them, every tick within the limit`, { timeout: 60_000 }, async () => {
      const t = await twoPhones({ latency, worlds: ["sea", "land"] });
      const lazy = (game) => (game === t.game("b") && game.state.round?.step % 200 > 120 ? undefined : chase(game));
      await bothPlaying(t, lazy);
      expect(t.game("a").state.round.world).toBe("sea");
      expect(t.game("b").state.round.world).toBe("land");
      await t.w.pass(60_000, t.frames(lazy));
      expectSameEnd(t);
      const { outcome } = t.game("a").state;
      expect(outcome.mine).toBeGreaterThan(0);
      expect(outcome.theirs).toBeGreaterThan(0);
      expect(outcome.score).toBeGreaterThanOrEqual(outcome.mine + outcome.theirs);
      expect(Math.max(...ticks(t))).toBeLessThanOrEqual(TICK_LIMIT);
    });
  }

  it("freezes both phones while either player has the pause open", async () => {
    const t = await twoPhones();
    await bothPlaying(t, chase);
    await t.w.pass(1000, t.frames(chase));
    await press(t.game("a"), "pause");
    await t.w.pass(300, t.frames());
    const steps = [t.game("a").state.round.step, t.game("b").state.round.step];
    await t.w.pass(2000, t.frames());
    expect([t.game("a").state.round.step, t.game("b").state.round.step]).toEqual(steps);
    await press(t.game("a"), "resume");
    await t.w.pass(600, t.frames(chase));
    expect(t.game("b").state.round.step).toBeGreaterThan(steps[1]);
  });

  it("goes back home, the other's seat empty, when the other leaves in the middle of a round", async () => {
    const t = await twoPhones();
    await bothPlaying(t, chase);
    await press(t.game("b"), "pause");
    await press(t.game("b"), "home");
    await t.w.pass(400, t.frames());
    expect(t.game("a").state).toMatchObject({ screen: "home", round: null });
    expect(t.game("a").duel.status.away).toBe(true);
  });

  it("gets through a stall on the wire and still agrees on the result", { timeout: 60_000 }, async () => {
    const t = await twoPhones({ latency: 90 });
    await bothPlaying(t, chase);
    await t.w.pass(5000, t.frames(chase));
    t.w.held.b = true;
    await t.w.pass(1500, t.frames(chase));
    t.w.held.b = false;
    await t.w.pass(60_000, t.frames(chase));
    expectSameEnd(t);
  });
});
