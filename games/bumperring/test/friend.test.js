import { describe, expect, it } from "vitest";
import { draw, recorder } from "../../../kit/test/canvas/recorder.js";
import { drawFriendLeft, friendLeft } from "../../../kit/src/duel/left.js";
import { drawFrame } from "../src/frame.js";
import { TEXTS } from "../src/texts.js";
import { THEME } from "../src/theme.js";
import { fromBase64 } from "../../../kit/src/envelope.js";
import { TICK_LIMIT } from "../../../kit/src/live/wire.js";
import { liveWorld } from "../../../kit/test/duel/world.js";
import { START } from "../src/arena.js";
import { COUNTDOWN } from "../src/rounds.js";
import { finger, gameOn, playWell, press, targetOf } from "./harness.js";

const decode = (data) => JSON.parse(new TextDecoder().decode(fromBase64(data)));

async function twoPhones({ latency = 40 } = {}) {
  const w = liveWorld({ latency, make: (phone, { clock }) => gameOn(phone.core.ft, { clock, seed: phone.name === "a" ? 3 : 11, page: phone.page }) });
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

const mine = (game) => game.state.round.match.bodies[game.state.round.seat];
const theirs = (game) => game.state.round.match.bodies[1 - game.state.round.seat];

function sameScore(a, b) {
  expect([a.state.screen, b.state.screen]).toEqual(["end", "end"]);
  expect(a.state.outcome.mine).toBe(b.state.outcome.theirs);
  expect(a.state.outcome.theirs).toBe(b.state.outcome.mine);
}

function noteOf(game) {
  const host = document.createElement("div");
  const canvas = document.createElement("canvas");
  host.append(canvas);
  const ctx = recorder();
  ctx.canvas = canvas;
  return () => {
    drawFrame(ctx, game, THEME, 1);
    const line = host.querySelector("p");
    return line && !line.hidden ? line.textContent : null;
  };
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

  it("starts on both phones only once both are ready, on the same platform, each stepping only its own player and nothing sent in the countdown", async () => {
    const t = await twoPhones();
    await press(t.game("a"), "play");
    await t.w.pass(300, t.frames());
    await press(t.game("b"), "play");
    await t.w.pass(COUNTDOWN - 600, t.frames());
    const kinds = (name) => t.w.phones[name].core.sent.map((data) => decode(data).k);
    expect([...kinds("a"), ...kinds("b")]).not.toContain("tick");
    await t.w.pass(1000, t.frames());
    const [a, b] = [t.game("a"), t.game("b")];
    expect([a.state.screen, b.state.screen]).toEqual(["play", "play"]);
    expect(a.state.round.seat + b.state.round.seat).toBe(1);
    expect(a.state.round.match.seed).toBe(b.state.round.match.seed);
    expect(a.state.round.match.variant).toBe(b.state.round.match.variant);
    expect(a.state.round.own).toEqual(b.state.round.own.toReversed());
    expect(a.state.round.match.step).toBeGreaterThan(0);
  });

  it("shows the other player where their own phone has them, a moment late", async () => {
    const t = await twoPhones();
    await bothPlaying(t);
    const [a, b] = [t.game("a"), t.game("b")];
    for (const game of [a, b]) game.state.round.match.variant = "plain";
    finger(a, "down");
    await t.w.pass(400, t.frames());
    finger(a, "up");
    await t.w.pass(700, t.frames());
    const moved = Math.hypot(mine(a).x - START[a.state.round.seat][0], mine(a).y - START[a.state.round.seat][1]);
    expect(moved).toBeGreaterThan(0.2);
    expect(Math.hypot(theirs(b).x - mine(a).x, theirs(b).y - mine(a).y)).toBeLessThan(0.08);
    expect([mine(b).x, mine(b).y]).toEqual(START[b.state.round.seat]);
  });

  it("reports a shove from the phone that gave it, and lets the shoved phone apply it to its own player and count its own fall", async () => {
    const t = await twoPhones({ latency: 80 });
    await bothPlaying(t);
    const [a, b] = [t.game("a"), t.game("b")];
    for (const game of [a, b]) game.state.round.match.variant = "plain";
    const toward = START[b.state.round.seat][1] - START[a.state.round.seat][1] > 0 ? 1 : -1;
    Object.assign(mine(a), { ax: 0, ay: toward });
    finger(a, "down");
    await t.w.pass(1000, t.frames());
    finger(a, "up");
    const before = { ...mine(b) };
    await t.w.pass(400, t.frames());
    expect(a.state.round.match.told[a.state.round.seat]).toHaveLength(1);
    expect(a.state.moments.some((one) => one.kind === "bump")).toBe(true);
    expect(mine(b).lost).toBe(0);
    await t.w.pass(1200, t.frames());
    expect(Math.abs(mine(b).vy) + Math.abs(mine(b).y - before.y)).toBeGreaterThan(0.3);
    expect(mine(b).lost).toBe(1);
    await t.w.pass(400, t.frames());
    expect(theirs(a).lost).toBe(1);
    expect(mine(a).lost).toBe(0);
  });

  it("plays a whole round to the same score on both phones, mirrored, and gives both their stars", { timeout: 60_000 }, async () => {
    const t = await twoPhones();
    await bothPlaying(t, playWell);
    await t.w.pass(75_000, t.frames((game) => playWell(game, game === t.game("b") ? 0.4 : 0.95)));
    const [a, b] = [t.game("a"), t.game("b")];
    sameScore(a, b);
    expect(a.state.outcome.stars).toBeGreaterThanOrEqual(1);
    expect(a.state.outcome.won && b.state.outcome.won).toBe(false);
  });

  it("ends on the same score whatever the lag between the phones", { timeout: 120_000 }, async () => {
    for (const latency of [15, 150, 350]) {
      const t = await twoPhones({ latency });
      await bothPlaying(t, playWell);
      await t.w.pass(75_000, t.frames(playWell));
      sameScore(t.game("a"), t.game("b"));
    }
  });

  it("never sends a tick larger than the channel carries", { timeout: 60_000 }, async () => {
    const t = await twoPhones();
    await bothPlaying(t, playWell);
    await t.w.pass(20_000, t.frames(playWell));
    const sizes = [...t.w.phones.a.core.sent, ...t.w.phones.b.core.sent].map((data) => fromBase64(data).length);
    expect(sizes.length).toBeGreaterThan(200);
    expect(Math.max(...sizes)).toBeLessThan(TICK_LIMIT * 0.6);
  });

  it("has no pause in a round with a friend", async () => {
    const t = await twoPhones();
    await bothPlaying(t, playWell);
    for (const name of ["a", "b"]) {
      const game = t.game(name);
      expect(targetOf(game, "pause")).toBeUndefined();
      expect(game.state.layout.controls.pause).toBeNull();
      expect(() => draw((pen) => drawFrame(pen, game, THEME, 1))).not.toThrow();
    }
  });

  it("leaves the round when the page is hidden, and the friend goes home told why, in a line under the buttons and on its seat", async () => {
    const t = await twoPhones();
    await bothPlaying(t, playWell);
    await t.w.pass(1000, t.frames(playWell));
    t.w.hide("a");
    expect(t.game("a").state).toMatchObject({ screen: "home", round: null, paused: false });
    await t.w.pass(400, t.frames());
    const b = t.game("b");
    expect(b.state).toMatchObject({ screen: "home", round: null });
    expect(friendLeft(b.duel.status)).toBe(true);
    const mark = JSON.stringify(draw((pen) => drawFriendLeft(pen, targetOf(b, "rival"), b.duel.status, THEME.ui)).calls).slice(1, -1);
    expect(JSON.stringify(draw((pen) => drawFrame(pen, b, THEME, 1)).calls)).toContain(mark);
    const told = noteOf(b);
    expect(told()).toBe(TEXTS.en.away);
    t.w.hide("a", false);
    await t.w.pass(400, t.frames());
    expect(t.game("a").state.screen).toBe("home");
    expect(friendLeft(t.game("a").duel.status)).toBe(false);
    expect(noteOf(t.game("a"))()).toBeNull();
    await press(b, "play");
    await t.w.pass(300, t.frames());
    await press(t.game("a"), "play");
    await t.w.pass(COUNTDOWN + 400, t.frames(playWell));
    expect([t.game("a").state.screen, b.state.screen]).toEqual(["play", "play"]);
    expect(told()).toBeNull();
  });

  it("goes back home, the other's seat marked as gone, when the other closes the game in the middle of a round", async () => {
    const t = await twoPhones();
    await bothPlaying(t, playWell);
    t.game("b").close();
    await t.w.pass(400, t.frames());
    expect(t.game("a").state).toMatchObject({ screen: "home", round: null });
    expect(t.game("a").duel.status.away).toBe(true);
    expect(friendLeft(t.game("a").duel.status)).toBe(true);
  });

  it("goes back home when the other phone, on an older version, pauses its round", async () => {
    const t = await twoPhones();
    await bothPlaying(t, playWell);
    const { duel } = t.game("b");
    const send = duel.send.bind(duel);
    duel.send = (time, state, now, options) => send(time, { ...state, p: 1 }, now, options);
    await t.w.pass(400, t.frames(playWell));
    expect(t.game("a").state).toMatchObject({ screen: "home", round: null });
    expect(friendLeft(t.game("a").duel.status)).toBe(true);
  });

  it("gets through a stall on the wire and still agrees on the score", { timeout: 60_000 }, async () => {
    const t = await twoPhones({ latency: 90 });
    await bothPlaying(t, playWell);
    await t.w.pass(5000, t.frames(playWell));
    t.w.held.b = true;
    await t.w.pass(1500, t.frames(playWell));
    t.w.held.b = false;
    await t.w.pass(75_000, t.frames(playWell));
    sameScore(t.game("a"), t.game("b"));
  });
});
