import { describe, expect, it } from "vitest";
import { encodeSetup } from "../src/generate.js";
import { ENTER_MS } from "../src/motion.js";
import { turnOf, usefulNow } from "../src/round.js";
import { fastForward, freshRound, hintOf, jarFill, keptRound, roundKey, savedRound } from "../src/rounds.js";

const SETUP = { team: false, tier: 0, golems: 5, hits: 2, caps: 0, most: 30, seed: "AbCdEfGh" };
const TEAM = { team: true, tier: 0, golems: 4, hits: 4, caps: 0, most: 100, seed: "AbCdEfGh" };

describe("a round on the screen", () => {
  it("starts with its first golem rolling in, nothing to wait for but that", () => {
    const round = freshRound({ kind: "alone", setup: SETUP, now: 1000 });
    expect(round).toMatchObject({ kind: "alone", code: encodeSetup(SETUP), mySide: 0, hits: [], finished: false, enter: { start: 1000 }, busyUntil: 1000 + ENTER_MS });
    expect(round.stand).toEqual({ value: round.core.value, count: 1, cap: round.core.golems[0].cap });
    expect(jarFill(round)).toBe(0);
  });

  it("is kept under the conversation's own key, by its code and the divisors hit so far", () => {
    expect(roundKey({ chat: "abc" })).toBe("round/abc");
    expect(roundKey({ chat: null })).toBe("round/-");
    const round = freshRound({ kind: "flick", setup: TEAM, now: 0 });
    const hits = [];
    let core = round.core;
    for (let at = 0; at < 3; at += 1) hits.push(usefulNow(core, turnOf(core))[0]), (core = fastForward(round, hits, 0).core);
    const kept = JSON.parse(savedRound(fastForward(round, hits, 0)));
    expect(kept).toEqual({ v: 1, kind: "flick", code: encodeSetup(TEAM), hits });
    const back = keptRound(kept, 500);
    expect(back.core).toEqual(core);
    expect(back.hits).toEqual(hits);
    expect(back.stand.value).toBe(core.value);
    expect(back.split).toBeNull();
  });

  it("comes back as nothing when what was kept is not a round of this game, or was a round with a friend", () => {
    const good = JSON.parse(savedRound(freshRound({ kind: "alone", setup: SETUP, now: 0 })));
    for (const bad of [null, {}, { ...good, v: 2 }, { ...good, kind: "friend" }, { ...good, code: "nope" }, { ...good, hits: [97] }, { ...good, hits: "2" }]) expect(keptRound(bad, 0)).toBeNull();
    expect(keptRound(good, 0)).not.toBeNull();
  });

  it("fills the jar golem by golem", () => {
    const round = freshRound({ kind: "alone", setup: SETUP, now: 0 });
    const hits = [];
    let now = round;
    while (now.core.at === 0) hits.push(usefulNow(now.core, 0)[0]), (now = fastForward(round, hits, 0));
    expect(jarFill(now)).toBeCloseTo(1 / 5);
    expect(jarFill({ ...now, leave: { start: 0 } })).toBe(0);
  });
});

describe("the teaching hand", () => {
  it("points at a divisor that fits until the player has hit once, and again after two clinks on a golem", () => {
    const round = freshRound({ kind: "alone", setup: SETUP, now: 0 });
    const fitting = usefulNow(round.core, 0);
    expect(fitting).toContain(hintOf(round, { taught: false }).divisor);
    expect(hintOf(round, { taught: true })).toBeNull();
    expect(hintOf({ ...round, struggle: 2 }, { taught: true })).toEqual({ divisor: fitting[0] });
  });

  it("stays away while it is the teammate's turn or the round is done", () => {
    const round = freshRound({ kind: "flick", setup: TEAM, now: 0 });
    const mine = turnOf(round.core) === 0;
    expect(hintOf(round, { taught: false }) !== null).toBe(mine);
    expect(hintOf({ ...round, mySide: 1 }, { taught: false }) !== null).toBe(!mine);
    expect(hintOf({ ...round, finished: true }, { taught: false })).toBeNull();
  });
});
