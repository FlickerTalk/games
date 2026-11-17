import { describe, expect, it } from "vitest";
import { draw, recorder } from "../../../kit/test/canvas/recorder.js";
import { liveWorld } from "../../../kit/test/duel/world.js";
import { drawFriendLeft, friendLeft } from "../../../kit/src/duel/left.js";
import { fromBase64 } from "../../../kit/src/envelope.js";
import { drawFrame } from "../src/frame.js";
import { COUNTDOWN } from "../src/rounds.js";
import { TEXTS } from "../src/texts.js";
import { THEME } from "../src/theme.js";
import { stateOf } from "../src/wire.js";
import { fingerAt, follow, gameOn, press, targetOf } from "./harness.js";

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

  it("starts on both phones only once both are ready, each with its own paddle at the near end", async () => {
    const t = await twoPhones();
    await bothPlaying(t);
    const [a, b] = [t.game("a"), t.game("b")];
    expect([a.state.screen, b.state.screen]).toEqual(["play", "play"]);
    expect(a.state.round.seat + b.state.round.seat).toBe(1);
    expect(a.state.round.match.seed).toBe(b.state.round.match.seed);
    expect(a.state.round.match.step).toBeGreaterThan(0);
    expect(b.state.round.match.step).toBeGreaterThan(0);
  });

  it("plays a whole round to the same score on both phones, mirrored, and gives both their stars", { timeout: 60_000 }, async () => {
    const t = await twoPhones();
    await bothPlaying(t, follow);
    const lazy = (game) => (game === t.game("b") && game.state.round?.match.step % 900 > 600 ? fingerAt(game, 0.95) : follow(game));
    await t.w.pass(70_000, t.frames(lazy));
    const [a, b] = [t.game("a"), t.game("b")];
    expect([a.state.screen, b.state.screen]).toEqual(["end", "end"]);
    expect(a.state.outcome.mine).toBe(b.state.outcome.theirs);
    expect(a.state.outcome.theirs).toBe(b.state.outcome.mine);
    expect(a.state.outcome.mine + a.state.outcome.theirs).toBeGreaterThan(0);
    expect(a.state.outcome.stars).toBeGreaterThanOrEqual(1);
  });

  it("has no pause in a round with a friend", async () => {
    const t = await twoPhones();
    await bothPlaying(t, follow);
    for (const name of ["a", "b"]) {
      expect(targetOf(t.game(name), "pause")).toBeUndefined();
      expect(t.game(name).state.layout.controls.pause).toBeNull();
    }
  });

  it("leaves the round when the page is hidden, and the friend goes home told why, in a line under the buttons and on its seat", async () => {
    const t = await twoPhones();
    await bothPlaying(t, follow);
    await t.w.pass(1000, t.frames(follow));
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
    await t.w.pass(COUNTDOWN + 400, t.frames(follow));
    expect([t.game("a").state.screen, b.state.screen]).toEqual(["play", "play"]);
    expect(told()).toBeNull();
  });

  it("goes back home, the other's seat marked as gone, when the other closes the game in the middle of a round", async () => {
    const t = await twoPhones();
    await bothPlaying(t, follow);
    t.game("b").close();
    await t.w.pass(400, t.frames());
    expect(t.game("a").state).toMatchObject({ screen: "home", round: null });
    expect(t.game("a").duel.status.away).toBe(true);
    expect(friendLeft(t.game("a").duel.status)).toBe(true);
  });

  it("goes back home when the other phone, on an older version, pauses its round", async () => {
    const t = await twoPhones();
    await bothPlaying(t, follow);
    await t.w.pass(300, (phone, now) => {
      const { game } = phone.made;
      game.frame(now);
      if (phone.name !== "b" || !game.state.round) return;
      const { round } = game.state;
      game.duel.send(game.duel.raceTime(now), stateOf(round.match, round.seat, { look: game.state.progress.chosen.paddle, paused: true, ended: false }), now, { soon: true });
    });
    expect(t.game("a").state).toMatchObject({ screen: "home", round: null });
    expect(friendLeft(t.game("a").duel.status)).toBe(true);
  });

  it("gets through a stall on the wire and still agrees on the score", { timeout: 60_000 }, async () => {
    const t = await twoPhones({ latency: 90 });
    await bothPlaying(t, follow);
    await t.w.pass(5000, t.frames(follow));
    t.w.held.b = true;
    await t.w.pass(1500, t.frames(follow));
    t.w.held.b = false;
    await t.w.pass(70_000, t.frames(follow));
    const [a, b] = [t.game("a"), t.game("b")];
    expect([a.state.screen, b.state.screen]).toEqual(["end", "end"]);
    expect(a.state.outcome.mine).toBe(b.state.outcome.theirs);
  });
});
