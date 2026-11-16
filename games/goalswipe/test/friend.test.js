import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { unseal } from "../../../kit/src/envelope.js";
import { fakeCore, phones, settle } from "../../../kit/test/helpers.js";
import { Friend } from "../src/friend.js";
import { snapAim, snapDive } from "../src/kicks.js";

const LEFT = snapAim({ x: 0.15, y: 0.3 });
const RIGHT = snapDive({ x: 0.85, y: 0.3 });
const SAME = snapDive({ x: 0.16, y: 0.3 });

function memoryStore() {
  const kept = new Map();
  return { kept, get: async (key) => kept.get(key) ?? null, set: async (key, value) => (kept.set(key, value), true), forget: async (key) => kept.delete(key) };
}

async function open(core, store = memoryStore()) {
  const friend = new Friend({ ft: { ...core.ft, store }, opening: { live: true, chat: core.chat, lang: "en" }, app: "1.0.0" });
  await friend.ready();
  return friend;
}

const both = (...friends) => settle(friends.map((friend) => friend.table));

async function pair() {
  const { a, b } = phones();
  const one = await open(a);
  const two = await open(b);
  await one.start();
  await both(one, two);
  await both(one, two);
  return { a, b, one, two };
}

async function kick(one, two, aim, dive) {
  const [shooter, keeper] = one.seen.myTurn ? [one, two] : [two, one];
  expect(await shooter.shoot(aim)).toBe(true);
  await both(one, two);
  expect(await keeper.dive(dive)).toBe(true);
  await both(one, two);
  expect(await shooter.reveal()).toBe(true);
  await both(one, two);
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("the shoot-out with the other person in the chat", () => {
  it("says nothing when the game opens", async () => {
    const core = fakeCore();
    const friend = await open(core);
    expect(core.sent).toEqual([]);
    expect(friend.status).toMatchObject({ here: false, playing: false, invited: false });
    expect(friend.seen).toBeNull();
  });

  it("invites the other phone when the player starts, and the two agree on who shoots first", async () => {
    const { a, one, two } = await pair();
    expect(a.sent.length).toBeGreaterThan(0);
    expect(one.status).toMatchObject({ here: true, playing: true, invited: false });
    expect(two.status).toMatchObject({ here: true, playing: true, invited: true });
    expect(one.seen.myTurn).not.toBe(two.seen.myTurn);
    expect(one.seen.state.phase).toBe("commit");
    await two.start();
    expect(two.status.invited).toBe(false);
  });

  it("plays a kick in three steps and never lets the shot travel before the keeper has dived", async () => {
    const { a, b, one, two } = await pair();
    const [shooter, keeper, wire] = one.seen.myTurn ? [one, two, a] : [two, one, b];
    await shooter.shoot(LEFT);
    await both(one, two);
    expect(keeper.seen.state.phase).toBe("dive");
    const travelled = wire.sent.map((data) => JSON.stringify(unseal(data, { g: "goalswipe", gv: 1 })?.message?.game?.moves ?? []));
    for (const moves of travelled) expect(moves).not.toMatch(/"r/);
    expect(await shooter.reveal()).toBe(false);
    expect(await shooter.dive(RIGHT)).toBe(false);
    await keeper.dive(RIGHT);
    await both(one, two);
    await shooter.reveal();
    await both(one, two);
    for (const friend of [one, two]) expect(friend.seen.state.kicks).toEqual([{ aim: LEFT, dive: RIGHT, outcome: "goal", bonus: null }]);
    expect(keeper.seen.myTurn).toBe(true);
  });

  it("keeps the shot on the shooter's phone, so a game closed before the reveal can still show it", async () => {
    const { a, b } = phones();
    const stores = [memoryStore(), memoryStore()];
    let one = await open(a, stores[0]);
    let two = await open(b, stores[1]);
    await one.start();
    await both(one, two);
    await both(one, two);
    const first = one.seen.myTurn;
    const [shooter, keeper] = first ? [one, two] : [two, one];
    await shooter.shoot(LEFT);
    await both(one, two);
    await keeper.dive(SAME);
    await both(one, two);
    await shooter.leave();
    const again = await open(first ? a : b, stores[first ? 0 : 1]);
    await again.start();
    await both(again, keeper);
    expect(await again.reveal()).toBe(true);
    await both(again, keeper);
    expect(keeper.seen.state.kicks[0]).toMatchObject({ aim: LEFT, outcome: "saved" });
  });

  it("plays a whole round to its winner, the same on both phones, and starts the next when asked", async () => {
    const { one, two } = await pair();
    const starter = one.seen.myTurn ? one : two;
    for (let index = 0; index < 6; index += 1) await kick(one, two, LEFT, index % 2 ? SAME : RIGHT);
    expect(one.seen.phase).toBe("over");
    expect(two.seen.phase).toBe("over");
    expect(starter.won).toBe(true);
    expect((starter === one ? two : one).won).toBe(false);
    expect(await one.again()).toBe(true);
    await both(one, two);
    expect(one.seen).toMatchObject({ phase: "play", index: 1 });
    expect(two.seen).toMatchObject({ phase: "play", index: 1 });
    expect(await two.again()).toBe(false);
  });

  it("says the other person is away when nobody answers", async () => {
    const { a, b } = phones();
    b.closed = true;
    const one = await open(a);
    await one.start();
    expect(one.status.calling).toBe(true);
    await vi.advanceTimersByTimeAsync(9000);
    await both(one);
    expect(one.status).toMatchObject({ here: false, away: true, playing: false });
  });
});
