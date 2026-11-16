// @vitest-environment node
import { describe, expect, it } from "vitest";
import { fromBase64 } from "../../src/envelope.js";
import { ScoredSession } from "../../src/duel/session.js";
import { fakeCore } from "../helpers.js";

const decode = (data) => JSON.parse(new TextDecoder().decode(fromBase64(data)));
const check = (s) => (s && typeof s === "object" && Number.isFinite(s.goals) ? { goals: s.goals } : null);

function world({ latency = 40 } = {}) {
  const clock = { now: 1000 };
  const queue = [];
  const ids = { a: ["doca", "aaaa"], b: ["docb", "bbbb"] };
  const make = (name) => {
    const core = fakeCore();
    const heard = [];
    const session = new ScoredSession({ ft: core.ft, g: "toy", gv: 1, app: "1.0.0", check, clock: () => clock.now, onState: (s) => heard.push(s), newId: () => ids[name].shift() });
    return { name, core, session, heard };
  };
  const a = make("a");
  const b = make("b");
  for (const [from, to] of [[a, b], [b, a]]) from.core.wire = (data) => queue.push({ to, data, due: clock.now + latency });
  const pass = async (ms, each = () => {}) => {
    const end = clock.now + ms;
    while (clock.now < end) {
      clock.now = Math.min(end, clock.now + 16);
      for (const phone of [a, b]) {
        phone.session.tick(clock.now);
        each(phone);
      }
      for (let at = 0; at < 3; at += 1) await Promise.resolve();
      while (queue.length && queue[0].due <= clock.now) {
        const { to, data } = queue.shift();
        to.session.heard(data);
      }
      for (let at = 0; at < 3; at += 1) await Promise.resolve();
    }
  };
  return { a, b, clock, pass };
}

async function running(w) {
  w.a.session.start();
  await w.pass(100);
  w.b.session.start();
  await w.pass(3200);
  expect([w.a.session.phase, w.b.session.phase]).toEqual(["running", "running"]);
}

const race = (session, now) => now - session.startAt;

describe("a real-time match decided by what both phones agree on", () => {
  it("ends when both phones have ended, and hands each phone both final states instead of a finish-time winner", async () => {
    const w = world();
    await running(w);
    const goals = { a: 2, b: 5 };
    await w.pass(500, (phone) => phone.session.run(race(phone.session, w.clock.now), { goals: goals[phone.name] }, w.clock.now));
    w.b.session.end(race(w.b.session, w.clock.now), { goals: 5 });
    expect(w.b.session.phase).toBe("finished");
    await w.pass(100);
    w.a.session.end(race(w.a.session, w.clock.now), { goals: 2 });
    await w.pass(200);
    expect(w.a.session.phase).toBe("over");
    expect(w.b.session.phase).toBe("over");
    expect(w.a.session.result).toEqual({ mine: { goals: 2 }, theirs: { goals: 5 } });
    expect(w.b.session.result).toEqual({ mine: { goals: 5 }, theirs: { goals: 2 } });
  });

  it("sends its final state ahead of its end, even when the pace would hold a tick back", async () => {
    const w = world();
    await running(w);
    w.a.session.run(race(w.a.session, w.clock.now), { goals: 1 }, w.clock.now);
    for (let at = 0; at < 3; at += 1) await Promise.resolve();
    const before = w.a.core.sent.length;
    w.a.session.end(race(w.a.session, w.clock.now), { goals: 4 });
    const sent = w.a.core.sent.slice(before).map(decode);
    expect(sent.map((one) => one.k)).toEqual(["tick", "done"]);
    expect(sent[0].s).toEqual({ goals: 4 });
  });

  it("sends a tick that cannot wait as soon as the core took the last one, not on the next beat", async () => {
    const w = world();
    await running(w);
    const ticks = () => w.a.core.sent.map(decode).filter((one) => one.k === "tick").length;
    w.a.session.run(race(w.a.session, w.clock.now), { goals: 0 }, w.clock.now);
    for (let at = 0; at < 3; at += 1) await Promise.resolve();
    const first = ticks();
    w.a.session.run(race(w.a.session, w.clock.now + 10), { goals: 0 }, w.clock.now + 10);
    expect(ticks()).toBe(first);
    w.a.session.run(race(w.a.session, w.clock.now + 10), { goals: 1 }, w.clock.now + 10, { soon: true });
    expect(ticks()).toBe(first + 1);
  });

  it("keeps listening to the other phone after this one ended, until the other ends too", async () => {
    const w = world();
    await running(w);
    w.a.session.end(race(w.a.session, w.clock.now), { goals: 3 });
    await w.pass(100, (phone) => phone === w.b && phone.session.run(race(phone.session, w.clock.now), { goals: 1 }, w.clock.now));
    expect(w.a.session.phase).toBe("finished");
    expect(w.a.heard.at(-1)).toEqual({ goals: 1 });
    w.b.session.end(race(w.b.session, w.clock.now), { goals: 2 });
    await w.pass(100);
    expect(w.a.session.result).toEqual({ mine: { goals: 3 }, theirs: { goals: 2 } });
  });

  it("still says the other left when it goes quiet before ending", async () => {
    const w = world();
    await running(w);
    w.a.session.end(race(w.a.session, w.clock.now), { goals: 3 });
    w.b.session.heard = () => {};
    w.b.session.tick = () => {};
    await w.pass(7000);
    expect(w.a.session.phase).toBe("left");
    expect(w.a.session.notice).toBe("silent");
  });

  it("sends nothing and ends at once against the phone", () => {
    const core = fakeCore();
    const session = new ScoredSession({ ft: core.ft, g: "toy", gv: 1, app: "1.0.0", solo: true, check, clock: () => 0 });
    session.start();
    session.tick(5000);
    session.end(10, { goals: 1 });
    expect(session.phase).toBe("over");
    expect(session.result).toEqual({ mine: { goals: 1 }, theirs: null });
    expect(core.ft.live.send).not.toHaveBeenCalled();
  });
});
