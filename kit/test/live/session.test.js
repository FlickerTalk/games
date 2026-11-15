import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KV, PROTOCOL, fromBase64, toBase64 } from "../../src/envelope.js";
import { LIVE_TIMING, Session, verdict } from "../../src/live/session.js";
import { sealLive } from "../../src/live/wire.js";
import { fakeCore } from "../helpers.js";

const decode = (data) => JSON.parse(new TextDecoder().decode(fromBase64(data)));
const kinds = (core) => core.sent.map((data) => decode(data).k);
const check = (s) => (s && typeof s === "object" && Number.isFinite(s.d) ? { d: s.d } : null);

function solo({ now = 1000 } = {}) {
  const core = fakeCore();
  const clock = { now };
  const changes = vi.fn();
  const session = new Session({ ft: core.ft, g: "toy", gv: 1, app: "1.0.0", solo: true, clock: () => clock.now, onChange: changes });
  return { core, clock, changes, session };
}

function phones({ latency = 40 } = {}) {
  const clock = { now: 1000 };
  const queue = [];
  const ids = { a: ["doca", "aaaa"], b: ["docb", "bbbb"] };
  const make = (name) => {
    const core = fakeCore();
    const states = [];
    const session = new Session({
      ft: core.ft,
      g: "toy",
      gv: 1,
      app: "1.0.0",
      check,
      clock: () => clock.now,
      onState: (s, t, at) => states.push({ s, t, at }),
      newId: () => ids[name].shift() ?? `${name}${Math.random().toString(36).slice(2, 10)}`,
    });
    return { name, core, session, states };
  };
  const a = make("a");
  const b = make("b");
  for (const [from, to] of [[a, b], [b, a]]) from.core.wire = (data) => queue.push({ to, data, due: clock.now + latency });
  const deliver = async () => {
    for (let at = 0; at < 3; at += 1) await Promise.resolve();
    while (queue.length && queue[0].due <= clock.now) {
      const { to, data } = queue.shift();
      if (!to.closed) to.session.heard(data);
    }
    for (let at = 0; at < 3; at += 1) await Promise.resolve();
  };
  const pass = async (ms, each = () => {}) => {
    const end = clock.now + ms;
    while (clock.now < end) {
      clock.now = Math.min(end, clock.now + 16);
      for (const phone of [a, b]) {
        phone.session.tick(clock.now);
        each(phone);
      }
      await deliver();
    }
  };
  return { a, b, clock, queue, deliver, pass };
}

async function lobby(world) {
  world.a.session.start();
  await world.pass(100);
  world.b.session.start();
  await world.pass(100);
}

const drive = (speeds) => (phone) => {
  const session = phone.session;
  if (session.phase !== "running" || session.mine !== null) return;
  const t = phone.clockOf(session);
  const d = (t * speeds[phone.name]) / 1000;
  if (d >= 100) session.finish(Math.round((100 * 1000) / speeds[phone.name]));
  else session.run(t, { d }, phone.session.clock());
};

function withClock(world) {
  for (const phone of [world.a, world.b]) phone.clockOf = (session) => world.clock.now - session.startAt;
  return world;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("who wins", () => {
  it("is whoever finished in less time, the same on both phones", () => {
    expect(verdict({ mine: 40_000, theirs: 41_000, me: "b", peer: "a" })).toBe("won");
    expect(verdict({ mine: 41_000, theirs: 40_000, me: "a", peer: "b" })).toBe("lost");
  });

  it("breaks an exact tie the same way on both phones", () => {
    const one = verdict({ mine: 40_000, theirs: 40_000, me: "a", peer: "b" });
    const two = verdict({ mine: 40_000, theirs: 40_000, me: "b", peer: "a" });
    expect([one, two].sort()).toEqual(["lost", "won"]);
  });

  it("is known before both finish once the one still going is past the other's time", () => {
    expect(verdict({ mine: 40_000, theirClock: 40_100 })).toBe("won");
    expect(verdict({ mine: 40_000, theirClock: 40_000 })).toBe("won");
    expect(verdict({ mine: 40_000, theirClock: 39_900 })).toBeNull();
    expect(verdict({ mine: null, mineClock: 41_000, theirs: 40_000 })).toBe("lost");
    expect(verdict({ mine: null, mineClock: 39_000, theirs: 40_000 })).toBeNull();
    expect(verdict({ mine: null, mineClock: 39_000 })).toBeNull();
  });

  it("goes to the one still in the race when the other stopped without finishing", () => {
    expect(verdict({ mine: 40_000, theirs: null })).toBe("won");
  });
});

describe("a race against the phone", () => {
  it("waits until the user starts it, then counts down and goes, without a word on the live channel", () => {
    const { core, clock, changes, session } = solo();
    expect(session.phase).toBe("idle");
    session.start();
    expect(session.phase).toBe("countdown");
    expect(session.seat).toBe(0);
    expect(session.startAt).toBe(1000 + LIVE_TIMING.countdown);
    expect(session.until(1500)).toBe(LIVE_TIMING.countdown - 500);
    session.tick(clock.now + LIVE_TIMING.countdown - 1);
    expect(session.phase).toBe("countdown");
    session.tick(clock.now + LIVE_TIMING.countdown);
    expect(session.phase).toBe("running");
    expect(changes).toHaveBeenCalled();
    expect(core.ft.live.send).not.toHaveBeenCalled();
  });

  it("is won by finishing first, the phone-driven rival reporting its own clock", () => {
    const { core, session } = solo();
    session.start();
    session.tick(1000 + LIVE_TIMING.countdown);
    session.run(30_000);
    session.rival(30_000, null);
    session.finish(39_500);
    expect(session.phase).toBe("finished");
    session.rival(39_516, null);
    expect(session.phase).toBe("over");
    expect(session.result).toEqual({ won: true, mine: 39_500, theirs: null });
    session.rival(41_000, 41_000);
    expect(session.result).toEqual({ won: true, mine: 39_500, theirs: null });
    expect(core.ft.live.send).not.toHaveBeenCalled();
  });

  it("is lost once the rival has finished and the user's clock is past its time", () => {
    const { session } = solo();
    session.start();
    session.tick(1000 + LIVE_TIMING.countdown);
    session.rival(40_000, 40_000);
    session.run(39_990);
    expect(session.phase).toBe("running");
    session.run(40_010);
    expect(session.phase).toBe("over");
    expect(session.result).toEqual({ won: false, mine: null, theirs: 40_000 });
    session.finish(42_000);
    expect(session.result.mine).toBeNull();
  });

  it("starts again with a new race, and ignores a second start while one runs", () => {
    const { session } = solo();
    session.start();
    const first = session.id;
    session.start();
    expect(session.id).toBe(first);
    session.tick(1000 + LIVE_TIMING.countdown);
    session.finish(40_000);
    session.rival(40_016, null);
    session.start();
    expect(session.phase).toBe("countdown");
    expect(session.id).not.toBe(first);
    expect(session.result).toBeNull();
  });

  it("does nothing with what arrives on the live channel, nor says goodbye", () => {
    const { core, session } = solo();
    session.heard(sealLive({ g: "toy", gv: 1, k: "hello", doc: "x", who: "y", ready: true }));
    expect(session.phase).toBe("idle");
    session.start();
    session.tick(1000 + LIVE_TIMING.countdown);
    session.run(100, { d: 1 }, 5000);
    session.finish(200);
    session.stop();
    expect(core.ft.live.send).not.toHaveBeenCalled();
  });
});

describe("a race between two phones", () => {
  it("says nothing until the user starts, then hello; the other phone, open, answers that it is there", async () => {
    const world = phones();
    const { a, b } = world;
    await world.pass(500);
    expect(a.core.sent).toEqual([]);
    expect(b.core.sent).toEqual([]);
    a.session.start();
    expect(a.session.phase).toBe("waiting");
    expect(decode(a.core.sent[0])).toEqual({ p: PROTOCOL, kv: KV, g: "toy", gv: 1, k: "hello", doc: "doca", who: "aaaa", ready: true, app: "1.0.0" });
    await world.pass(100);
    expect(b.session.phase).toBe("lobby");
    expect(b.session.ready).toEqual({ me: false, them: true });
    expect(kinds(b.core)).toEqual(["hello"]);
    expect(decode(b.core.sent[0])).toMatchObject({ doc: "doca", ready: false, re: true });
    expect(a.session.phase).toBe("lobby");
    expect(a.session.ready).toEqual({ me: true, them: false });
    expect(kinds(a.core)).toEqual(["hello"]);
  });

  it("counts down on both phones once both are ready, the one with the smaller id giving the go", async () => {
    const world = phones({ latency: 40 });
    await lobby(world);
    const { a, b } = world;
    expect(kinds(b.core)).toEqual(["hello", "ready"]);
    expect(kinds(a.core)).toEqual(["hello", "go"]);
    expect([a.session.phase, b.session.phase]).toEqual(["countdown", "countdown"]);
    expect([a.session.seat, b.session.seat]).toEqual([0, 1]);
    expect(Math.abs(a.session.startAt - b.session.startAt)).toBeLessThanOrEqual(60);
  });

  it("sends the user's state about twelve times a second while running, and hands the other's to the game", async () => {
    const world = withClock(phones());
    await lobby(world);
    await world.pass(LIVE_TIMING.countdown + 50);
    const ticks = () => kinds(world.a.core).filter((kind) => kind === "tick").length;
    const before = ticks();
    await world.pass(1000, drive({ a: 4, b: 3 }));
    expect(ticks() - before).toBeGreaterThanOrEqual(10);
    expect(ticks() - before).toBeLessThanOrEqual(13);
    const heard = world.b.states.at(-1);
    expect(heard.s.d).toBeGreaterThan(0);
    expect(heard.t).toBeGreaterThan(900);
  });

  it("ends with the same winner on both phones, the slower one stopping as soon as it cannot win", async () => {
    const world = withClock(phones({ latency: 60 }));
    await lobby(world);
    await world.pass(LIVE_TIMING.countdown + 100);
    await world.pass(40_000, drive({ a: 4, b: 3 }));
    const { a, b } = world;
    expect([a.session.phase, b.session.phase]).toEqual(["over", "over"]);
    expect(a.session.result).toEqual({ won: true, mine: 25_000, theirs: null });
    expect(b.session.result).toEqual({ won: false, mine: null, theirs: 25_000 });
    expect(decode(b.core.sent.at(-1))).toMatchObject({ k: "done", t: null });
  });

  it("agrees on the winner when both cross the line before hearing of the other, each by its own clock", async () => {
    const world = withClock(phones({ latency: 300 }));
    await lobby(world);
    await world.pass(LIVE_TIMING.countdown + 1000);
    await world.pass(40_000, drive({ a: 3.99, b: 4 }));
    const { a, b } = world;
    expect(a.session.result).toEqual({ won: false, mine: 25_063, theirs: 25_000 });
    expect(b.session.result).toEqual({ won: true, mine: 25_000, theirs: 25_063 });
  });

  it("stops sending the moment the core refuses a message, says the other phone cannot be reached, and tries again only when asked", async () => {
    const world = withClock(phones());
    await lobby(world);
    await world.pass(LIVE_TIMING.countdown + 50);
    await world.pass(500, drive({ a: 4, b: 3 }));
    const { a } = world;
    a.core.reachable = false;
    await world.pass(200, drive({ a: 4, b: 3 }));
    expect(a.session.phase).toBe("left");
    expect(a.session.notice).toBe("unreachable");
    const sent = a.core.sent.length;
    await world.pass(3000, drive({ a: 4, b: 3 }));
    a.session.run(10_000, { d: 1 }, world.clock.now);
    a.session.finish(20_000);
    a.session.stop();
    expect(a.core.sent.length).toBe(sent);
    a.core.reachable = true;
    a.session.start();
    expect(a.core.sent.length).toBe(sent + 1);
    expect(decode(a.core.sent.at(-1))).toMatchObject({ k: "hello", ready: true });
  });

  it("does not ask again by itself when nobody answers, and says the other person does not have the game open", async () => {
    const world = phones();
    world.b.closed = true;
    world.a.session.start();
    await world.pass(LIVE_TIMING.answer + 100);
    vi.advanceTimersByTime(LIVE_TIMING.answer);
    expect(world.a.session.notice).toBe("notOpen");
    await world.pass(30_000);
    vi.advanceTimersByTime(30_000);
    expect(kinds(world.a.core)).toEqual(["hello"]);
  });

  it("says the other left when they say bye, or go silent in the middle of a race", async () => {
    const world = withClock(phones());
    await lobby(world);
    await world.pass(LIVE_TIMING.countdown + 50);
    world.b.session.stop();
    await world.pass(100);
    expect(world.a.session.phase).toBe("left");
    expect(world.a.session.notice).toBe("left");
    const quiet = withClock(phones());
    await lobby(quiet);
    await quiet.pass(LIVE_TIMING.countdown + 50);
    quiet.b.closed = true;
    await quiet.pass(LIVE_TIMING.silence + 500, (phone) => phone === quiet.a && drive({ a: 1, b: 1 })(phone));
    expect(quiet.a.session.phase).toBe("left");
    expect(quiet.a.session.notice).toBe("silent");
  });

  it("finds one race when both start at the same moment", async () => {
    const world = phones();
    world.a.session.start();
    world.b.session.start();
    await world.pass(400);
    expect(world.a.session.id).toBe(world.b.session.id);
    expect([world.a.session.phase, world.b.session.phase]).toEqual(["countdown", "countdown"]);
  });

  it("ignores garbage, other games, strangers and anything out of turn, and never stalls on it", async () => {
    const world = withClock(phones());
    const { a } = world;
    const junk = [
      "",
      "%%%",
      toBase64(new TextEncoder().encode("[1,2,3]")),
      sealLive({ g: "other", gv: 1, k: "hello", doc: "doca", who: "zzzz", ready: true }),
      sealLive({ g: "toy", gv: 1, k: "go", doc: "doca", who: "zzzz", ms: 0 }),
      sealLive({ g: "toy", gv: 1, k: "tick", doc: "doca", who: "zzzz", t: 5, s: { d: 1 } }),
      sealLive({ g: "toy", gv: 1, k: "done", doc: "doca", who: "zzzz", t: 1 }),
      sealLive({ g: "toy", gv: 1, k: "bye", doc: "doca", who: "zzzz" }),
    ];
    for (const data of junk) a.session.heard(data);
    expect(a.session.phase).toBe("idle");
    await lobby(world);
    for (const data of junk) a.session.heard(data);
    a.session.heard(sealLive({ g: "toy", gv: 1, k: "tick", doc: "doca", who: "bbbb", t: 5, s: { d: "far" } }));
    a.session.heard(sealLive({ g: "toy", gv: 1, k: "done", doc: "docx", who: "bbbb", t: 1 }));
    expect(a.session.phase).toBe("countdown");
    expect(a.states).toEqual([]);
    await world.pass(LIVE_TIMING.countdown + 50);
    await world.pass(30_000, drive({ a: 4, b: 3 }));
    expect(a.session.result.won).toBe(true);
  });

  it("tells the user when the other phone has a newer version of the game", () => {
    const world = phones();
    const newer = toBase64(new TextEncoder().encode(JSON.stringify({ p: PROTOCOL, kv: KV, g: "toy", gv: 2, k: "hello", doc: "d", who: "w", app: "1.3.0" })));
    world.a.session.heard(newer);
    expect(world.a.session.notice).toBe("update");
    expect(world.a.session.newer).toBe("1.3.0");
    expect(world.a.core.sent).toEqual([]);
  });
});
