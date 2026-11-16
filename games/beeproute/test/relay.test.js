import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TIMING } from "../../../kit/src/table.js";
import { fakeCore, phones, settle } from "../../../kit/test/helpers.js";
import { encodeLevel, makeLevel } from "../src/level.js";
import { encodeProgram } from "../src/program.js";
import { Relay } from "../src/relay.js";

const LEVEL = encodeLevel(makeLevel({ size: 5, start: { at: 22, dir: 0 }, rows: ["..G..", ".....", ".....", ".....", "....."] }));
const OTHER = encodeLevel(makeLevel({ size: 5, start: { at: 20, dir: 1 }, rows: [".....", ".....", ".....", ".....", "....G"] }));
const WALLED = encodeLevel(makeLevel({ size: 5, start: { at: 22, dir: 0 }, rows: ["..G..", "#####", ".....", ".....", "....."] }));
const SOLVES = ["F", "F", "F", "F"];

function memoryStore() {
  const kept = new Map();
  return { kept, get: async (key) => kept.get(key) ?? null, set: async (key, value) => (kept.set(key, value), true), forget: async (key) => kept.delete(key) };
}

async function open(core, store = memoryStore()) {
  const relay = new Relay({ ft: { ...core.ft, store }, opening: { live: true, chat: core.chat, lang: "en" }, app: "1.0.0" });
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
  return one.duty() === "build" ? { builder: one, solver: two, a, b } : { builder: two, solver: one, a, b };
}

describe("two phones making and solving levels", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("say nothing when the game opens, and have nothing to do until the player starts", async () => {
    const core = fakeCore();
    const relay = await open(core);
    expect(core.sent).toEqual([]);
    expect(relay.duty()).toBe("start");
    expect(relay.status).toMatchObject({ here: false, away: false });
  });

  it("let the coin pick who makes the first level while the other waits for it", async () => {
    const { builder, solver } = await started();
    expect(builder.duty()).toBe("build");
    expect(solver.duty()).toBe("wait");
    expect(builder.status.here).toBe(true);
  });

  it("send the level as one move, the solution back, and let the solver make the next level", async () => {
    const { builder, solver } = await started();
    await builder.sendLevel(LEVEL);
    await both(builder, solver);
    expect(builder.duty()).toBe("wait");
    expect(solver.duty()).toBe("solve");
    expect(encodeLevel(solver.level())).toBe(LEVEL);
    await solver.sendProgram(encodeProgram(SOLVES));
    await both(builder, solver);
    expect(solver.duty()).toBe("build");
    expect(builder.duty()).toBe("watch");
    expect(builder.solution()).toEqual(SOLVES);
    expect(encodeLevel(builder.level())).toBe(LEVEL);
    await builder.markWatched();
    expect(builder.duty()).toBe("wait");
    await solver.sendLevel(OTHER);
    await both(builder, solver);
    expect(builder.duty()).toBe("solve");
    expect(encodeLevel(builder.level())).toBe(OTHER);
    expect(solver.duty()).toBe("wait");
  });

  it("never send a level that cannot be solved, nor a program that does not reach the goal", async () => {
    const { builder, solver, a, b } = await started();
    const before = a.sent.length + b.sent.length;
    await builder.sendLevel(WALLED);
    expect(builder.duty()).toBe("build");
    expect(a.sent.length + b.sent.length).toBe(before);
    await builder.sendLevel(LEVEL);
    await both(builder, solver);
    await solver.sendProgram(encodeProgram(["F"]));
    expect(solver.duty()).toBe("solve");
  });

  it("remember on this phone which solution was already watched", async () => {
    const stores = [memoryStore(), memoryStore()];
    const cores = phones();
    const one = await open(cores.a, stores[0]);
    const two = await open(cores.b, stores[1]);
    await one.start();
    await both(one, two);
    const first = one.duty() === "build" ? 0 : 1;
    const [builder, solver] = first === 0 ? [one, two] : [two, one];
    await builder.sendLevel(LEVEL);
    await both(one, two);
    await solver.sendProgram(encodeProgram(SOLVES));
    await both(one, two);
    await builder.markWatched();
    const again = await open(first === 0 ? cores.a : cores.b, stores[first]);
    await again.start();
    expect(again.duty()).toBe("wait");
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
