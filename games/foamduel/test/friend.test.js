import { describe, expect, it } from "vitest";
import { liveWorld } from "../../../kit/test/duel/world.js";
import { fromBase64 } from "../../../kit/src/envelope.js";
import { TICK_LIMIT } from "../../../kit/src/live/wire.js";
import { COUNTDOWN } from "../src/rounds.js";
import { gameOn, phaseOf, press, reacting, strikeNow } from "./harness.js";

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
    each(phone.made.game, { now });
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
const sees = (game, x) => game.state.round.shown.has(x);
const verdictOf = (game, x) => game.state.round.verdicts.get(x);

async function untilBell(t, game, from = 0) {
  for (let waited = 0; waited < 20_000; waited += 16) {
    const { exchange, phase } = phaseOf(game);
    if (phase === "go" && exchange.x >= from && sees(game, exchange.x)) return exchange;
    await t.w.pass(16, t.frames());
  }
  throw new Error("no bell");
}

async function untilWait(t, game, from = 0) {
  for (let waited = 0; waited < 20_000; waited += 16) {
    const { exchange, phase } = phaseOf(game);
    if (phase === "wait" && exchange.x >= from) return exchange;
    await t.w.pass(16, t.frames());
  }
  throw new Error("no exchange");
}

describe("a duel with the other person in the chat", () => {
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

  it("starts on both phones only once both are ready, with the same exchanges and no tick during the countdown", async () => {
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
    expect(a.state.round.schedule.length).toBeGreaterThan(5);
    expect(a.state.round.step).toBeGreaterThan(0);
    expect(b.state.round.step).toBeGreaterThan(0);
  });

  it("holds the swing of the one who tapped until the other phone's round has passed that time, then pops the other's balloon on both phones", async () => {
    const t = await twoPhones({ latency: 120 });
    await bothPlaying(t);
    const [a, b] = [t.game("a"), t.game("b")];
    const exchange = await untilBell(t, a);
    await t.w.pass(200, t.frames());
    strikeNow(a);
    expect(a.state.round.claims[a.state.round.seat]).toHaveLength(1);
    expect(verdictOf(a, exchange.x)).toBeUndefined();
    expect(a.state.round.scores).toEqual([0, 0]);
    await t.w.pass(700, t.frames());
    expect(verdictOf(a, exchange.x)).toMatchObject({ win: [true, false] });
    expect(verdictOf(b, exchange.x)).toMatchObject({ win: [false, true] });
    expect(a.state.round.scores).toEqual([1, 0]);
    expect(b.state.round.scores).toEqual([0, 1]);
    strikeNow(b);
    expect(b.state.round.claims[b.state.round.seat]).toEqual([]);
  });

  it("gives the exchange to whoever reacted faster on their own phone, not to whose message arrived first", async () => {
    const t = await twoPhones({ latency: 200 });
    await bothPlaying(t);
    const [first, second] = [seated(t, 0), seated(t, 1)];
    const exchange = await untilBell(t, first);
    expect(sees(second, exchange.x)).toBe(false);
    await t.w.pass(400, t.frames((game) => {
      if (game === second && sees(second, exchange.x) && !second.state.round.late) second.state.round.late = second.now();
    }));
    strikeNow(first);
    const waited = second.now() - second.state.round.late;
    expect(waited).toBeGreaterThan(100);
    await t.w.pass(Math.max(0, 250 - waited), t.frames());
    strikeNow(second);
    const [slow, quick] = [first.state.round.claims[0][0], second.state.round.claims[1][0]];
    expect(quick.r).toBeLessThan(slow.r);
    await t.w.pass(800, t.frames());
    expect(verdictOf(first, exchange.x)).toMatchObject({ win: [false, true] });
    expect(verdictOf(second, exchange.x)).toMatchObject({ win: [true, false] });
    expect(first.state.round.scores).toEqual([0, 1]);
    expect(second.state.round.scores).toEqual([1, 0]);
  });

  it("makes a tap before the bell a stumble on both phones, and the other's point", async () => {
    const t = await twoPhones();
    await bothPlaying(t);
    const [a, b] = [t.game("a"), t.game("b")];
    const exchange = await untilWait(t, a);
    strikeNow(a);
    expect(verdictOf(a, exchange.x)).toMatchObject({ win: [false, true], early: [true, false] });
    await t.w.pass(400, t.frames());
    expect(verdictOf(b, exchange.x)).toMatchObject({ win: [true, false], early: [false, true] });
    expect(b.state.moments.some((one) => one.kind === "stumble" && one.side === 1)).toBe(true);
    expect(b.state.round.scores).toEqual([1, 0]);
  });

  it("does not believe a phone that claims a time nobody can have: it loses the exchange on both", async () => {
    const t = await twoPhones();
    await bothPlaying(t);
    const [a, b] = [t.game("a"), t.game("b")];
    const exchange = await untilBell(t, a);
    a.state.round.claims[a.state.round.seat].push({ x: exchange.x, r: 5, seat: a.state.round.seat });
    await t.w.pass(300, t.frames());
    strikeNow(b);
    await t.w.pass(500, t.frames());
    expect(verdictOf(b, exchange.x)).toMatchObject({ win: [true, false], early: [false, true] });
    expect(verdictOf(a, exchange.x)).toMatchObject({ win: [false, true], early: [true, false] });
  });

  it("plays a whole round to the same score on both phones and gives both their stars, every tick within the limit", { timeout: 60_000 }, async () => {
    const t = await twoPhones();
    const [quick, slow] = [reacting(260), reacting(420)];
    const each = (game, time) => (game === t.game("a") ? quick(game, time) : slow(game, time));
    await bothPlaying(t, each);
    await t.w.pass(62_000, t.frames(each));
    const [a, b] = [t.game("a"), t.game("b")];
    expect([a.state.screen, b.state.screen]).toEqual(["end", "end"]);
    expect(a.state.outcome.mine).toBe(b.state.outcome.theirs);
    expect(a.state.outcome.theirs).toBe(b.state.outcome.mine);
    expect(a.state.outcome.mine).toBeGreaterThanOrEqual(6);
    expect(b.state.outcome.mine).toBe(0);
    expect(a.state.outcome.stars).toBe(3);
    expect([a.state.outcome.won, b.state.outcome.won]).toEqual([true, false]);
    const ticks = [...t.w.phones.a.core.sent, ...t.w.phones.b.core.sent].map((data) => fromBase64(data).length);
    expect(Math.max(...ticks)).toBeLessThanOrEqual(TICK_LIMIT);
  });

  it("freezes both phones while either player has the pause open", async () => {
    const t = await twoPhones();
    await bothPlaying(t);
    await t.w.pass(1000, t.frames());
    await press(t.game("a"), "pause");
    await t.w.pass(300, t.frames());
    const steps = [t.game("a").state.round.step, t.game("b").state.round.step];
    await t.w.pass(2000, t.frames());
    expect([t.game("a").state.round.step, t.game("b").state.round.step]).toEqual(steps);
    strikeNow(t.game("b"));
    expect(t.game("b").state.round.claims.flat()).toEqual([]);
    await press(t.game("a"), "resume");
    await t.w.pass(600, t.frames());
    expect(t.game("b").state.round.step).toBeGreaterThan(steps[1]);
  });

  it("goes back home, the other's seat empty, when the other leaves in the middle of a round", async () => {
    const t = await twoPhones();
    await bothPlaying(t);
    await press(t.game("b"), "pause");
    await press(t.game("b"), "home");
    await t.w.pass(400, t.frames());
    expect(t.game("a").state).toMatchObject({ screen: "home", round: null });
    expect(t.game("a").duel.status.away).toBe(true);
  });

  it("gets through a stall on the wire and still agrees on the score", { timeout: 60_000 }, async () => {
    const t = await twoPhones({ latency: 90 });
    const [one, two] = [reacting(300), reacting(330)];
    const each = (game, time) => (game === t.game("a") ? one(game, time) : two(game, time));
    await bothPlaying(t, each);
    await t.w.pass(5000, t.frames(each));
    t.w.held.b = true;
    await t.w.pass(1500, t.frames(each));
    t.w.held.b = false;
    await t.w.pass(62_000, t.frames(each));
    const [a, b] = [t.game("a"), t.game("b")];
    expect([a.state.screen, b.state.screen]).toEqual(["end", "end"]);
    expect(a.state.outcome.mine).toBe(b.state.outcome.theirs);
    expect(a.state.outcome.theirs).toBe(b.state.outcome.mine);
    expect(a.state.outcome.mine + a.state.outcome.theirs).toBeGreaterThan(5);
  });
});
