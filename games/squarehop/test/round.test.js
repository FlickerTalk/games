import { describe, expect, it } from "vitest";
import { TIMES, advance, canPick, choose, diceShown, freshRound, keptRound, replay, savedRound, spotsOf, stagesOf, trailOf, turnOf } from "../src/round.js";
import { diceFor, hop, startRace } from "../src/rules.js";

const KEY = Uint8Array.from({ length: 48 }, (_, at) => (at * 7) % 251);
const ready = (round) => round.rolledAt + TIMES.roll;

function run(round, from, to, step = 20) {
  const cues = [];
  for (let now = from; now <= to; now += step) cues.push(...advance(round, now));
  return cues;
}

function roundAt(at, next = 0) {
  const round = freshRound({ kind: "flick", key: KEY });
  round.race = { ...startRace(), at, next };
  return round;
}

function dieFor(round, steps) {
  const at = round.dice.indexOf(steps);
  if (at >= 0) return at;
  round.dice = [steps, steps === 6 ? 5 : steps + 1];
  return 0;
}

describe("a round on the screen", () => {
  it("starts with both pieces on the first square and the first dice rolling in", () => {
    const round = freshRound({ kind: "flick", key: KEY, now: 100 });
    expect(round.race).toEqual(startRace());
    expect(round.dice).toEqual(diceFor(KEY, 0));
    expect(diceShown(round, 150).state).toBe("rolling");
    expect(canPick(round, 150)).toBe(false);
    expect(diceShown(round, ready(round))).toEqual({ faces: round.dice, state: "ready", side: 0, chosen: null });
    expect(canPick(round, ready(round))).toBe(true);
    expect(turnOf(round)).toBe(0);
  });

  it("waits for a seed before it shows any dice", () => {
    const round = freshRound({ kind: "friend" });
    expect(round.dice).toBeNull();
    expect(diceShown(round, 5000)).toMatchObject({ faces: null, state: "waiting" });
    expect(canPick(round, 5000)).toBe(false);
  });

  it("hops square by square with a tick for each, then rolls the next dice", () => {
    const round = freshRound({ kind: "flick", key: KEY });
    const start = ready(round);
    const die = round.dice[1];
    choose(round, 1, start);
    expect(canPick(round, start)).toBe(false);
    expect(diceShown(round, start + 10)).toMatchObject({ state: "chosen", chosen: 1, side: 0 });
    const half = start + TIMES.choose + TIMES.hop * 0.5;
    advance(round, half);
    const [mine, theirs] = spotsOf(round, half);
    expect(mine.square).toBeGreaterThan(1);
    expect(mine.square).toBeLessThan(2);
    expect(mine.lift).toBeGreaterThan(0.5);
    expect(theirs).toMatchObject({ square: 1, lift: 0 });
    const cues = run(round, start, start + stagesOf(round.move.event).end + 40);
    expect(cues.filter((cue) => cue.name === "hop").map((cue) => cue.n)).toEqual(Array.from({ length: die }, (_, at) => at + 1));
    expect(cues.at(-1).name).toBe("roll");
    expect(round.move).toBeNull();
    expect(round.race).toEqual(hop(startRace(), die).race);
    expect(round.dice).toEqual(diceFor(KEY, 1));
    expect(round.picks).toEqual([1]);
    expect(turnOf(round)).toBe(1);
  });

  it("lights the squares it has counted while it hops, and none once it rests", () => {
    const round = roundAt([2, 1]);
    const start = ready(round);
    choose(round, dieFor(round, 3), start);
    expect(trailOf(round, start + 10)).toBeNull();
    expect(trailOf(round, start + TIMES.choose + TIMES.hop * 1.5)).toEqual({ side: 0, lit: [3, 4], active: 4 });
    expect(trailOf(round, start + TIMES.choose + TIMES.hop * 3.2)).toEqual({ side: 0, lit: [3, 4, 5], active: 5 });
    run(round, start, start + 5000);
    expect(trailOf(round, start + 5000)).toBeNull();
  });

  it("flies on from a spring, bumps the other piece back and says so", () => {
    const round = roundAt([3, 9]);
    const start = ready(round);
    choose(round, dieFor(round, 3), start);
    const { stages } = round.move;
    const midSpring = start + stages.hopped + TIMES.spring / 2;
    const [mine] = spotsOf(round, midSpring);
    expect(mine.square).toBeGreaterThan(6);
    expect(mine.square).toBeLessThan(9);
    const midBump = start + stages.special + TIMES.bump / 2;
    const [, theirs] = spotsOf(round, midBump);
    expect(theirs.square).toBeGreaterThan(8);
    expect(theirs.square).toBeLessThan(9);
    expect(theirs.state).toBe("bumped");
    const cues = run(round, start, start + stages.end + 40).map((cue) => cue.name);
    expect(cues).toContain("spring");
    expect(cues).toContain("bump");
    expect(round.race.at).toEqual([9, 8]);
  });

  it("says turbo, puddle and finish when a piece lands on them, and rolls no dice after the finish", () => {
    const names = (at, steps) => {
      const round = roundAt(at);
      choose(round, dieFor(round, steps), ready(round));
      return [run(round, 0, 9000).map((cue) => cue.name), round];
    };
    expect(names([8, 1], 3)[0]).toContain("turbo");
    expect(names([13, 1], 3)[0]).toContain("puddle");
    const [cues, round] = names([27, 1], 3);
    expect(cues).toContain("finish");
    expect(cues).not.toContain("roll");
    expect(round.dice).toBeNull();
    expect(round.race.winner).toBe(0);
    expect(canPick(round, 20000)).toBe(false);
  });

  it("plays picks that arrive early one after the other, each on its own dice", () => {
    const round = freshRound({ kind: "friend", key: KEY });
    choose(round, 0, 0);
    choose(round, 1, 0);
    expect(round.queue).toEqual([1]);
    run(round, 0, 20000);
    const first = hop(startRace(), diceFor(KEY, 0)[0]).race;
    expect(round.race).toEqual(hop(first, diceFor(KEY, 1)[1]).race);
    expect(round.queue).toEqual([]);
    expect(round.picks).toEqual([0, 1]);
  });

  it("is kept as its seed and its picks, and comes back exactly where it was", () => {
    const round = freshRound({ kind: "flick", key: KEY });
    replay(round, [0, 1, 1, 0]);
    const kept = keptRound(JSON.parse(savedRound(round)), 500);
    expect(kept.race).toEqual(round.race);
    expect(kept.dice).toEqual(round.dice);
    expect(kept.picks).toEqual([0, 1, 1, 0]);
    expect(kept.kind).toBe("flick");
    expect(kept.rolledAt).toBe(500);
    expect(keptRound(null)).toBeNull();
    expect(keptRound({ v: 1, kind: "friend", key: "AAAA", picks: "" })).toBeNull();
    expect(keptRound({ v: 1, kind: "flick", key: "short", picks: "01" })).toBeNull();
    expect(keptRound({ v: 1, kind: "flick", key: JSON.parse(savedRound(round)).key, picks: "012" })).toBeNull();
  });
});
