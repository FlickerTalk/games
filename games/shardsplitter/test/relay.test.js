import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TIMING } from "../../../kit/src/table.js";
import { fakeCore, phones, settle } from "../../../kit/test/helpers.js";
import { encodeSetup } from "../src/generate.js";
import { Relay } from "../src/relay.js";
import { turnOf, usefulNow } from "../src/round.js";

const CODE = encodeSetup({ team: true, tier: 0, golems: 3, hits: 4, caps: 0, most: 100, seed: "AbCdEfGh" });
const NEXT = encodeSetup({ team: true, tier: 1, golems: 3, hits: 4, caps: 0, most: 100, seed: "HgFeDcBa" });

async function open(core) {
  const relay = new Relay({ ft: core.ft, opening: { live: true, chat: core.chat, lang: "en" }, app: "1.0.0" });
  await relay.ready();
  return relay;
}

const both = (...sides) => settle(sides.map((side) => side.table));

async function started() {
  const { a, b } = phones();
  const one = await open(a);
  const two = await open(b);
  await one.start();
  await both(one, two);
  return one.duty() === "setup" ? { first: one, second: two, a, b } : { first: two, second: one, a, b };
}

async function playOut(first, second) {
  while (first.duty() === "play") {
    const mover = [first, second].find((one) => one.myTurn());
    await mover.hit(usefulNow(mover.round(), mover.mySide())[0]);
    await both(first, second);
  }
}

describe("two phones splitting golems as a team", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("say nothing when the game opens, and have nothing to do until the player starts", async () => {
    const core = fakeCore();
    const relay = await open(core);
    expect(core.sent).toEqual([]);
    expect(relay.duty()).toBe("start");
    expect(relay.round()).toBeNull();
    expect(relay.status).toMatchObject({ here: false, away: false });
  });

  it("let the coin pick who brings the round while the other waits for it", async () => {
    const { first, second } = await started();
    expect(first.duty()).toBe("setup");
    expect(second.duty()).toBe("wait");
    expect(first.status.here).toBe(true);
  });

  it("share the round as one move, deal each phone its own hand, and carry every hit as one number", async () => {
    const { first, second } = await started();
    await first.sendSetup(CODE);
    await both(first, second);
    expect([first.duty(), second.duty()]).toEqual(["play", "play"]);
    expect([first.mySide(), second.mySide()]).toEqual([0, 1]);
    expect(second.round()).toEqual(first.round());
    expect(first.moves()).toEqual([]);
    const mover = turnOf(first.round()) === 0 ? first : second;
    const waiter = mover === first ? second : first;
    expect(mover.myTurn()).toBe(true);
    expect(waiter.myTurn()).toBe(false);
    const divisor = usefulNow(mover.round(), mover.mySide())[0];
    await mover.hit(divisor);
    await both(first, second);
    expect(waiter.moves()).toEqual([divisor]);
    expect(waiter.round().value).toBe(first.round().value);
  });

  it("end the round on both phones, and let the other player bring the next one", async () => {
    const { first, second } = await started();
    await first.sendSetup(CODE);
    await both(first, second);
    const id = first.roundId();
    await playOut(first, second);
    expect(first.round().over).toBe(true);
    expect(second.round().over).toBe(true);
    expect([first.duty(), second.duty()]).toEqual(["wait", "setup"]);
    await second.sendSetup(NEXT);
    await both(first, second);
    expect([first.duty(), second.duty()]).toEqual(["play", "play"]);
    expect(first.roundId()).not.toBe(id);
    expect([first.mySide(), second.mySide()]).toEqual([1, 0]);
    expect(first.moves()).toEqual([]);
  });

  it("never send a hit out of turn or a code that is not a team round", async () => {
    const { first, second, a, b } = await started();
    await first.sendSetup(CODE.replace(/^S1/, "S0"));
    expect(first.duty()).toBe("setup");
    await first.sendSetup(CODE);
    await both(first, second);
    const before = a.sent.length + b.sent.length;
    const waiter = first.myTurn() ? second : first;
    await waiter.hit(waiter.round().hands[waiter.mySide()][0]);
    expect(a.sent.length + b.sent.length).toBe(before);
  });

  it("say when the other phone does not have the game open", async () => {
    const core = fakeCore();
    const relay = await open(core);
    await relay.start();
    await vi.advanceTimersByTimeAsync(TIMING.ack + 10);
    await relay.table.idle();
    expect(relay.status.away).toBe(true);
    expect(relay.duty()).toBe("wait");
  });
});
