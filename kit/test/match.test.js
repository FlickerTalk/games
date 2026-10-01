// A match as both phones keep it (README, "The match"): who is in it, the coin that says who
// starts, the moves, replayed through the rules from the first one every time, and how two copies
// of it come together (prefix, equal, divergent).
import { describe, expect, it } from "vitest";
import { coinToss, fromHex } from "../src/commit.js";
import { chooseFork, isEvent, merge, newId, newMatch, peerOf, replay, score, tossStep, view } from "../src/match.js";
import { toy } from "./helpers.js";

const bytes = (fill) => new Uint8Array(32).fill(fill);

/** Two phones' records of one match, the coin already tossed, `first` starting round 0. */
async function tossed(firstIs = "wa") {
  for (let fill = 1; ; fill += 1) {
    let a = newMatch({ g: "toy", gv: 1, id: "m1", me: "wa", now: 1 });
    let b = (await merge(null, a.game, toy, { me: "wb", from: "wa", g: "toy", gv: 1, id: "m1", now: 2 })).record;
    a = (await merge(a, b.game, toy, { from: "wb" })).record;
    const commit = await tossStep(a, { random: () => bytes(fill) });
    a = commit.record;
    b = (await merge(b, a.game, toy, { from: "wa" })).record;
    const seed = await tossStep(b, { random: () => bytes(fill + 100) });
    b = seed.record;
    a = (await merge(a, b.game, toy, { from: "wb" })).record;
    const reveal = await tossStep(a);
    a = reveal.record;
    b = (await merge(b, a.game, toy, { from: "wa" })).record;
    expect([commit.send, seed.send, reveal.send]).toEqual(["commit", "seed", "reveal"]);
    if (a.game.first === firstIs) return { a, b };
  }
}

/** One phone plays `move` in its record, as the table does. */
async function play(record, move) {
  const next = structuredClone(record);
  next.game.moves.push(move);
  expect(replay(next.game, toy).ok).toBe(true);
  return next;
}

describe("a new match", () => {
  it("is the starter's alone until someone joins, with plain random ids", () => {
    const record = newMatch({ g: "toy", gv: 1, now: 5 });
    expect(record).toMatchObject({ v: 1, g: "toy", gv: 1, heard: 0, fork: null, secret: null, created: 5, updated: 5 });
    expect(record.game).toEqual({ a: record.me, b: null, first: null, toss: {}, moves: [], end: null });
    expect(record.id).toMatch(/^[a-z0-9]{16}$/);
    expect(newId()).not.toBe(newId());
    expect(peerOf(record)).toBeNull();
    expect(view(record, toy).phase).toBe("invite");
  });

  it("is joined from the other phone's hello, which never hands over its own seat", async () => {
    const a = newMatch({ g: "toy", gv: 1, id: "m1", me: "wa" });
    const joined = await merge(null, a.game, toy, { me: "wb", from: "wa", g: "toy", gv: 1, id: "m1", now: 9 });
    expect(joined.verdict).toBe("took");
    expect(joined.record.game).toMatchObject({ a: "wa", b: "wb" });
    expect(peerOf(joined.record)).toBe("wa");
    // A hello from someone who is not its starter, or for a match already taken, is not joined.
    expect((await merge(null, a.game, toy, { me: "wb", from: "wx", g: "toy", gv: 1, id: "m1" })).verdict).toBe("stranger");
    expect((await merge(null, { ...a.game, b: "wz" }, toy, { me: "wb", from: "wa", g: "toy", gv: 1, id: "m1" })).verdict).toBe("stranger");
    // The starter learns who joined from the first answer, and nobody else gets the seat.
    const back = await merge(a, joined.record.game, toy, { from: "wb" });
    expect(back.record.game.b).toBe("wb");
    expect((await merge(back.record, joined.record.game, toy, { from: "wx" })).verdict).toBe("stranger");
  });
});

describe("the coin toss", () => {
  it("takes commit, seed and reveal, and both phones agree on who starts", async () => {
    const { a, b } = await tossed("wa");
    expect(b.game.first).toBe("wa");
    expect(a.game.toss).toEqual(b.game.toss);
    const outcome = await coinToss("m1", fromHex(a.game.toss.r), fromHex(a.game.toss.s));
    expect(outcome).toBe(0);
    const other = await tossed("wb");
    expect(other.b.game.first).toBe("wb");
    expect(view(a, toy)).toMatchObject({ phase: "play", turn: "wa", myTurn: true, mySide: 0 });
    expect(view(b, toy)).toMatchObject({ phase: "play", turn: "wa", myTurn: false, mySide: 1 });
  });

  it("keeps the secret until the seed is in, and sends nothing more once it is done", async () => {
    let a = newMatch({ g: "toy", gv: 1, id: "m1", me: "wa" });
    expect((await tossStep(a)).send).toBeNull(); // nobody to toss with yet
    a.game.b = "wb";
    const step = await tossStep(a, { random: () => bytes(7) });
    expect(step.send).toBe("commit");
    expect(step.record.game.toss.c).toMatch(/^[0-9a-f]{64}$/);
    expect(step.record.game.toss.r).toBeUndefined();
    expect(step.record.secret).toBe("07".repeat(32));
    expect((await tossStep(step.record)).send).toBeNull(); // waiting for the seed
    const { a: done } = await tossed();
    expect((await tossStep(done)).send).toBeNull();
  });

  it("makes the match invalid when the reveal does not match the commitment", async () => {
    let a = newMatch({ g: "toy", gv: 1, id: "m1", me: "wa" });
    let b = (await merge(null, a.game, toy, { me: "wb", from: "wa", g: "toy", gv: 1, id: "m1" })).record;
    a = (await merge(a, b.game, toy, { from: "wb" })).record;
    a = (await tossStep(a, { random: () => bytes(1) })).record;
    b = (await merge(b, a.game, toy, { from: "wa" })).record;
    b = (await tossStep(b, { random: () => bytes(2) })).record;
    a = (await merge(a, b.game, toy, { from: "wb" })).record;
    a = (await tossStep(a)).record;
    const cheat = structuredClone(a.game);
    cheat.toss.r = "03".repeat(32);
    const heard = await merge(b, cheat, toy, { from: "wa" });
    expect(heard.verdict).toBe("took");
    expect(heard.record.game.end).toEqual({ k: "invalid", by: "wa" });
    expect(view(heard.record, toy).phase).toBe("ended");
  });

  it("makes the match invalid when the starter changes its commitment after the seed", async () => {
    let a = newMatch({ g: "toy", gv: 1, id: "m1", me: "wa" });
    let b = (await merge(null, a.game, toy, { me: "wb", from: "wa", g: "toy", gv: 1, id: "m1" })).record;
    a = (await merge(a, b.game, toy, { from: "wb" })).record;
    a = (await tossStep(a, { random: () => bytes(1) })).record;
    b = (await merge(b, a.game, toy, { from: "wa" })).record;
    b = (await tossStep(b, { random: () => bytes(2) })).record;
    const changed = structuredClone(a.game);
    changed.toss.c = "ab".repeat(32);
    expect((await merge(b, changed, toy, { from: "wa" })).record.game.end).toEqual({ k: "invalid", by: "wa" });
  });
});

describe("replaying a match through the rules", () => {
  it("checks every move from the first, side by side, and tells who made each", async () => {
    const { a } = await tossed("wa");
    const game = { ...a.game, moves: ["p", "p", "w"] };
    const played = replay(game, toy);
    expect(played.ok).toBe(true);
    expect(played.actors).toEqual(["wa", "wb", "wa"]);
    expect(played.rounds[0].end).toEqual({ k: "rules", winner: "wa", result: { winner: 0 } });
    expect(replay({ ...a.game, moves: ["p", "x"] }, toy)).toMatchObject({ ok: false, at: 1, error: "bad" });
    expect(replay({ ...a.game, moves: ["w", "p"] }, toy)).toMatchObject({ ok: false, at: 1, error: "over" });
    // No moves before the coin says who starts; and only moves, resignations and new rounds.
    expect(replay({ ...a.game, first: null, moves: ["p"] }, toy)).toMatchObject({ ok: false, at: 0 });
    expect(isEvent("e2e4")).toBe(true);
    expect(isEvent(4)).toBe(true);
    expect(isEvent({ x: "resign", by: "wa" })).toBe(true);
    expect(isEvent({ x: "next" })).toBe(true);
    expect(isEvent({ x: "undo" })).toBe(false);
    expect(isEvent(null)).toBe(false);
    expect(isEvent([1])).toBe(false);
  });

  it("ends a round on a resignation, starts another in turn, and keeps the series score", async () => {
    const { a } = await tossed("wa");
    const game = { ...a.game, moves: ["p", { x: "resign", by: "wa" }, { x: "next" }, "w", { x: "next" }, "p", "d"] };
    const played = replay(game, toy);
    expect(played.ok).toBe(true);
    expect(played.rounds.map((round) => round.starter)).toEqual(["wa", "wb", "wa"]);
    expect(played.rounds[0].end).toEqual({ k: "resign", by: "wa", winner: "wb" });
    expect(played.rounds[1].end).toMatchObject({ k: "rules", winner: "wb" });
    expect(played.rounds[2].end).toMatchObject({ k: "rules", winner: null });
    expect(score(played, "wa")).toEqual({ me: 0, them: 2, draws: 1 });
    expect(score(played, "wb")).toEqual({ me: 2, them: 0, draws: 1 });
    // A new round only after the last one ended; a resignation only while it is on.
    expect(replay({ ...a.game, moves: [{ x: "next" }] }, toy).ok).toBe(false);
    expect(replay({ ...a.game, moves: ["w", { x: "resign", by: "wb" }] }, toy).ok).toBe(false);
    expect(replay({ ...a.game, moves: [{ x: "resign", by: "wx" }] }, toy).ok).toBe(false);
  });
});

describe("two copies of a match coming together", () => {
  it("takes the other's new moves when mine are the beginning of theirs", async () => {
    let { a, b } = await tossed("wa");
    a = await play(a, "p");
    const heard = await merge(b, a.game, toy, { from: "wa" });
    expect(heard.verdict).toBe("took");
    expect(heard.changed).toBe(true);
    expect(heard.record.game.moves).toEqual(["p"]);
    expect(view(heard.record, toy)).toMatchObject({ myTurn: true, last: "p" });
  });

  it("does nothing when they are equal, and says so when I am ahead", async () => {
    let { a, b } = await tossed("wa");
    expect(await merge(b, a.game, toy, { from: "wa" })).toMatchObject({ verdict: "same", changed: false });
    a = await play(a, "p");
    expect(await merge(a, b.game, toy, { from: "wb" })).toMatchObject({ verdict: "ahead", changed: false });
  });

  it("learns what the other has heard of mine, so a move stays pending until then", async () => {
    let { a, b } = await tossed("wa");
    a = await play(a, "p");
    expect(view(a, toy).pending).toBe(1);
    // Their copy without my move says nothing new; with it, my move has been heard.
    a = (await merge(a, b.game, toy, { from: "wb" })).record;
    expect(view(a, toy).pending).toBe(1);
    b = (await merge(b, a.game, toy, { from: "wa" })).record;
    a = (await merge(a, b.game, toy, { from: "wb" })).record;
    expect(a.heard).toBe(1);
    expect(view(a, toy).pending).toBe(0);
  });

  it("refuses moves that break the rules, or that were made for me", async () => {
    let { a, b } = await tossed("wa");
    const broken = { ...a.game, moves: ["x"] };
    expect(await merge(b, broken, toy, { from: "wa" })).toMatchObject({ verdict: "bad", changed: false });
    // It is wa's turn: wb cannot slip in a move for wa, nor resign for it.
    expect((await merge(a, { ...b.game, moves: ["p"] }, toy, { from: "wb" })).verdict).toBe("bad");
    expect((await merge(a, { ...b.game, moves: [{ x: "resign", by: "wa" }] }, toy, { from: "wb" })).verdict).toBe("bad");
    // Its own resignation is fine.
    expect((await merge(a, { ...b.game, moves: [{ x: "resign", by: "wb" }] }, toy, { from: "wb" })).verdict).toBe("took");
  });

  it("keeps both copies when they part ways, and asks which one to continue", async () => {
    // It is wb's turn: wb moves while wa resigns. Each phone has its own way on from move 1.
    let { a, b } = await tossed("wa");
    a = await play(a, "p");
    b = (await merge(b, a.game, toy, { from: "wa" })).record;
    b = await play(b, "p");
    a = await play(a, { x: "resign", by: "wa" });
    const heard = await merge(a, b.game, toy, { from: "wb" });
    expect(heard.verdict).toBe("fork");
    expect(heard.record.game.moves).toEqual(["p", { x: "resign", by: "wa" }]);
    expect(heard.record.fork).toEqual(["p", "p"]);
    expect(view(heard.record, toy).fork).toBe(true);
    expect(chooseFork(heard.record, "theirs").game.moves).toEqual(["p", "p"]);
    expect(chooseFork(heard.record, "mine")).toMatchObject({ fork: null, game: { moves: ["p", { x: "resign", by: "wa" }] } });
    // A way of theirs that holds a move for me that I never made is not offered at all.
    expect((await merge(a, { ...b.game, moves: ["d"] }, toy, { from: "wb" })).verdict).toBe("bad");
  });

  it("accepts an end of the whole match from the other phone, which gives nobody a win", async () => {
    const { a, b } = await tossed("wa");
    const gone = { ...b.game, end: { k: "abandoned", by: "wa" } };
    const heard = await merge(a, gone, toy, { from: "wb" });
    expect(heard.record.game.end).toEqual({ k: "abandoned", by: "wa" });
    expect(view(heard.record, toy)).toMatchObject({ phase: "ended", score: { me: 0, them: 0, draws: 0 } });
    expect((await merge(a, { ...b.game, end: { k: "won", by: "wb" } }, toy, { from: "wb" })).record.game.end).toBeNull();
  });
});
