import { describe, expect, it } from "vitest";
import { draw } from "../../../kit/test/canvas/recorder.js";
import { drawFriendLeft, friendLeft } from "../../../kit/src/duel/left.js";
import { drawFrame } from "../src/frame.js";
import { THEME } from "../src/theme.js";
import { liveWorld } from "../../../kit/test/duel/world.js";
import { fromBase64 } from "../../../kit/src/envelope.js";
import { COUNTDOWN } from "../src/rounds.js";
import { cycle, gameOn, press, targetOf } from "./harness.js";

const decode = (data) => JSON.parse(new TextDecoder().decode(fromBase64(data)));

async function twoPhones({ latency = 40 } = {}) {
  const w = liveWorld({ latency, make: (phone, { clock }) => gameOn(phone.core.ft, { clock, seed: phone.name === "a" ? 3 : 11, page: phone.page }) });
  for (const name of ["a", "b"]) {
    const { game } = w.phones[name].made;
    await game.open({ lang: "en", live: true, chat: w.phones[name].core.chat });
    game.resize(384, 801, true);
  }
  const game = (name) => w.phones[name].made.game;
  const plans = { a: cycle(["g", "b", "s", "g", "g"]), b: cycle(["b", "b", "g", "n", "s", "b"]) };
  const frames = (each = () => {}) => (phone, now) => {
    each(phone.made.game, phone.name);
    phone.made.game.frame(now);
  };
  const playing = frames((one, name) => plans[name](one));
  return { w, game, frames, playing };
}

async function bothPlaying(t, frames = t.playing) {
  await press(t.game("a"), "play");
  await t.w.pass(300, frames);
  await press(t.game("b"), "play");
  await t.w.pass(COUNTDOWN + 400, frames);
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

  it("starts on both phones only once both are ready, each with its own robot on the left, at the same settings", async () => {
    const t = await twoPhones();
    await bothPlaying(t);
    const [a, b] = [t.game("a"), t.game("b")];
    expect([a.state.screen, b.state.screen]).toEqual(["play", "play"]);
    expect(a.state.round.seat + b.state.round.seat).toBe(1);
    expect(a.state.round.settings).toEqual(b.state.round.settings);
    expect(a.state.round.step).toBeGreaterThan(0);
    expect(b.state.round.step).toBeGreaterThan(0);
  });

  it("never learns the other's move for a window before its own window has closed, and never sends a button still held", { timeout: 60_000 }, async () => {
    const t = await twoPhones();
    const seen = [];
    const watching = t.frames((one, name) => {
      (name === "a" ? cycle(["g", "b", "s"]) : cycle(["s", "g", "b"]))(one);
      const { round } = one.state;
      if (round) seen.push(round.theirs.length - round.mine.length);
    });
    await bothPlaying(t, watching);
    await t.w.pass(12_000, watching);
    expect(seen.length).toBeGreaterThan(500);
    expect(Math.max(...seen)).toBeLessThanOrEqual(0);
    const a = t.game("a");
    expect(a.state.round.mine.length).toBeGreaterThanOrEqual(4);
    for (const data of t.w.phones.a.core.sent) {
      const message = decode(data);
      if (message.k === "tick") expect(Object.keys(message.s.g).sort()).toEqual(["c", "e", "k", "p"]);
    }
  });

  it("shows both phones the same exchanges, each from its own side", { timeout: 60_000 }, async () => {
    const t = await twoPhones();
    await bothPlaying(t);
    await t.w.pass(9000, t.playing);
    const [a, b] = [t.game("a").state.round, t.game("b").state.round];
    const shared = Math.min(a.bout.count, b.bout.count);
    expect(shared).toBeGreaterThanOrEqual(3);
    expect(a.mine.slice(0, shared)).toEqual(b.theirs.slice(0, shared));
    expect(a.theirs.slice(0, shared)).toEqual(b.mine.slice(0, shared));
    expect(a.bout.hits[0] + a.bout.hits[1]).toBeGreaterThan(0);
  });

  it("plays a whole round to the same score on both phones, mirrored, and gives both their stars", { timeout: 60_000 }, async () => {
    const t = await twoPhones();
    await bothPlaying(t);
    await t.w.pass(70_000, t.playing);
    const [a, b] = [t.game("a"), t.game("b")];
    expect([a.state.screen, b.state.screen]).toEqual(["end", "end"]);
    expect(a.state.outcome.mine).toBe(b.state.outcome.theirs);
    expect(a.state.outcome.theirs).toBe(b.state.outcome.mine);
    expect(a.state.outcome.mine + a.state.outcome.theirs).toBeGreaterThan(0);
    expect(a.state.outcome.stars).toBeGreaterThanOrEqual(1);
  });

  it("shows the other player's robot once their phone has said which it is", async () => {
    const t = await twoPhones();
    t.game("b").state.progress = { ...t.game("b").state.progress, chosen: { robot: "wheel", stage: "shelf" } };
    await bothPlaying(t);
    await t.w.pass(500, t.playing);
    expect(t.game("a").state.round.looks[1]).toBe("wheel");
  });

  it("has no pause in a round with a friend", async () => {
    const t = await twoPhones();
    await bothPlaying(t);
    for (const name of ["a", "b"]) {
      const game = t.game(name);
      expect(targetOf(game, "pause")).toBeUndefined();
      expect(game.state.layout.controls.pause).toBeNull();
      expect(() => draw((pen) => drawFrame(pen, game, THEME, 1))).not.toThrow();
    }
  });

  it("leaves the round when the page is hidden, and the friend goes home with their seat marked as gone", async () => {
    const t = await twoPhones();
    await bothPlaying(t);
    await t.w.pass(1000, t.frames());
    t.w.hide("a");
    expect(t.game("a").state).toMatchObject({ screen: "home", round: null, paused: false });
    await t.w.pass(400, t.frames());
    const b = t.game("b");
    expect(b.state).toMatchObject({ screen: "home", round: null });
    expect(friendLeft(b.duel.status)).toBe(true);
    const mark = JSON.stringify(draw((pen) => drawFriendLeft(pen, targetOf(b, "rival"), b.duel.status, THEME.ui)).calls).slice(1, -1);
    expect(JSON.stringify(draw((pen) => drawFrame(pen, b, THEME, 1)).calls)).toContain(mark);
    t.w.hide("a", false);
    await t.w.pass(400, t.frames());
    expect(t.game("a").state.screen).toBe("home");
    expect(friendLeft(t.game("a").duel.status)).toBe(false);
    await press(b, "play");
    await t.w.pass(300, t.frames());
    await press(t.game("a"), "play");
    await t.w.pass(COUNTDOWN + 400, t.frames());
    expect([t.game("a").state.screen, b.state.screen]).toEqual(["play", "play"]);
  });

  it("goes back home, the other's seat marked as gone, when the other closes the game in the middle of a round", async () => {
    const t = await twoPhones();
    await bothPlaying(t);
    t.game("b").close();
    await t.w.pass(400, t.frames());
    expect(t.game("a").state).toMatchObject({ screen: "home", round: null });
    expect(t.game("a").duel.status.away).toBe(true);
    expect(friendLeft(t.game("a").duel.status)).toBe(true);
  });

  it("goes back home when the other phone, on an older version, pauses its round", async () => {
    const t = await twoPhones();
    await bothPlaying(t);
    const { duel } = t.game("b");
    const send = duel.send.bind(duel);
    duel.send = (time, state, now, options) => send(time, { ...state, p: 1 }, now, options);
    await t.w.pass(400, t.frames());
    expect(t.game("a").state).toMatchObject({ screen: "home", round: null });
    expect(friendLeft(t.game("a").duel.status)).toBe(true);
  });

  it("gets through a stall on the wire and still agrees on the score", { timeout: 60_000 }, async () => {
    const t = await twoPhones({ latency: 90 });
    await bothPlaying(t);
    await t.w.pass(5000, t.playing);
    t.w.held.b = true;
    await t.w.pass(4000, t.playing);
    t.w.held.b = false;
    await t.w.pass(70_000, t.playing);
    const [a, b] = [t.game("a"), t.game("b")];
    expect([a.state.screen, b.state.screen]).toEqual(["end", "end"]);
    expect(a.state.outcome.mine).toBe(b.state.outcome.theirs);
    expect(a.state.outcome.theirs).toBe(b.state.outcome.mine);
  });
});
