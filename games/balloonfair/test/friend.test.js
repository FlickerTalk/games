import { describe, expect, it } from "vitest";
import { liveWorld } from "../../../kit/test/duel/world.js";
import { fromBase64 } from "../../../kit/src/envelope.js";
import { TICK_LIMIT } from "../../../kit/src/live/wire.js";
import { COUNTDOWN } from "../src/rounds.js";
import { gameOn, onShow, pop, press, tapAt } from "./harness.js";

const decode = (data) => JSON.parse(new TextDecoder().decode(fromBase64(data)));

async function twoPhones({ latency = 40 } = {}) {
  const w = liveWorld({ latency, make: (phone, { clock }) => gameOn(phone.core.ft, { clock, seed: phone.name === "a" ? 3 : 11 }) });
  for (const name of ["a", "b"]) {
    const { game } = w.phones[name].made;
    await game.open({ lang: "en", live: true, chat: w.phones[name].core.chat });
    game.resize(384, 801, true);
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

const seated = (t, seat) => ["a", "b"].map((name) => t.game(name)).find((game) => game.state.round.seat === seat);
const scores = (game) => game.state.round.tally.scores;

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

  it("starts on both phones only once both are ready, with the same balloons and no tick during the countdown", async () => {
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
    expect(a.state.round.step).toBeGreaterThan(0);
    expect(b.state.round.step).toBeGreaterThan(0);
  });

  it("takes a balloon popped on one phone away on the other, and counts it for whoever popped it", async () => {
    const t = await twoPhones();
    await bothPlaying(t);
    await t.w.pass(2500, t.frames());
    const [a, b] = [t.game("a"), t.game("b")];
    const found = onShow(a, (kind) => kind === "round" || kind === "oval")[0];
    tapAt(a, found.x, found.y);
    await t.w.pass(600, t.frames());
    expect(onShow(b).some((one) => one.balloon.id === found.balloon.id)).toBe(false);
    expect(b.state.round.tally.pops.get(found.balloon.id).seat).toBe(a.state.round.seat);
    expect(scores(b)).toEqual(scores(a));
    expect(scores(a)[a.state.round.seat]).toBe(1);
    expect(b.state.moments.some((one) => one.kind === "pop" && one.by === a.state.round.seat)).toBe(true);
  });

  it("gives a balloon both tapped to the earlier time on the round's clock, and a tie to the first seat, the same on both phones", async () => {
    const t = await twoPhones({ latency: 120 });
    await bothPlaying(t);
    await t.w.pass(2500, t.frames());
    const [first, second] = [seated(t, 0), seated(t, 1)];
    const found = onShow(first, (kind) => kind === "round" || kind === "oval")[0];
    const theirs = onShow(second).find((one) => one.balloon.id === found.balloon.id);
    tapAt(second, theirs.x, theirs.y);
    tapAt(first, found.x, found.y);
    await t.w.pass(200, t.frames());
    expect(scores(first)[0] + scores(second)[1]).toBe(2);
    await t.w.pass(800, t.frames());
    const [mine, other] = [first.state.round.mine[0], second.state.round.mine[0]];
    const winner = other.t < mine.t ? 1 : 0;
    expect(first.state.round.tally.pops.get(found.balloon.id).seat).toBe(winner);
    expect(scores(first)).toEqual(scores(second));
    expect(scores(first)[0] + scores(first)[1]).toBe(1);
  });

  it("plays a whole round to the same score on both phones and gives both their stars, every tick within the limit", { timeout: 60_000 }, async () => {
    const t = await twoPhones();
    const bTakes = (one) => one.balloon.id % 4 === 0;
    const split = (game) => pop(game, game === t.game("b") ? bTakes : (one) => !bTakes(one));
    await bothPlaying(t, split);
    await t.w.pass(60_000, t.frames(split));
    const [a, b] = [t.game("a"), t.game("b")];
    expect([a.state.screen, b.state.screen]).toEqual(["end", "end"]);
    expect(a.state.outcome.mine).toBe(b.state.outcome.theirs);
    expect(a.state.outcome.theirs).toBe(b.state.outcome.mine);
    expect(a.state.outcome.mine).toBeGreaterThan(a.state.outcome.theirs);
    expect(b.state.outcome.mine).toBeGreaterThan(0);
    expect(a.state.outcome.stars).toBeGreaterThanOrEqual(2);
    expect([a.state.outcome.won, b.state.outcome.won]).toEqual([true, false]);
    const ticks = [...t.w.phones.a.core.sent, ...t.w.phones.b.core.sent].map((data) => fromBase64(data).length);
    expect(Math.max(...ticks)).toBeLessThanOrEqual(TICK_LIMIT);
  });

  it("freezes both phones while either player has the pause open", async () => {
    const t = await twoPhones();
    await bothPlaying(t, pop);
    await t.w.pass(1000, t.frames(pop));
    await press(t.game("a"), "pause");
    await t.w.pass(300, t.frames());
    const steps = [t.game("a").state.round.step, t.game("b").state.round.step];
    await t.w.pass(2000, t.frames());
    expect([t.game("a").state.round.step, t.game("b").state.round.step]).toEqual(steps);
    await press(t.game("a"), "resume");
    await t.w.pass(600, t.frames(pop));
    expect(t.game("b").state.round.step).toBeGreaterThan(steps[1]);
  });

  it("goes back home, the other's seat empty, when the other leaves in the middle of a round", async () => {
    const t = await twoPhones();
    await bothPlaying(t, pop);
    await press(t.game("b"), "pause");
    await press(t.game("b"), "home");
    await t.w.pass(400, t.frames());
    expect(t.game("a").state).toMatchObject({ screen: "home", round: null });
    expect(t.game("a").duel.status.away).toBe(true);
  });

  it("gets through a stall on the wire and still agrees on the score", { timeout: 60_000 }, async () => {
    const t = await twoPhones({ latency: 90 });
    await bothPlaying(t, pop);
    await t.w.pass(5000, t.frames(pop));
    t.w.held.b = true;
    await t.w.pass(1500, t.frames(pop));
    t.w.held.b = false;
    await t.w.pass(60_000, t.frames(pop));
    const [a, b] = [t.game("a"), t.game("b")];
    expect([a.state.screen, b.state.screen]).toEqual(["end", "end"]);
    expect(a.state.outcome.mine).toBe(b.state.outcome.theirs);
    expect(a.state.outcome.theirs).toBe(b.state.outcome.mine);
  });
});
