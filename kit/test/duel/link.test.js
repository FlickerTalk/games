// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { fromBase64 } from "../../src/envelope.js";
import { CanvasDuel } from "../../src/duel/link.js";
import { liveWorld } from "./world.js";

const decode = (data) => JSON.parse(new TextDecoder().decode(fromBase64(data)));
const check = (s) => (s && typeof s === "object" && Number.isFinite(s.x) && s.x >= 0 && s.x <= 1 ? { x: s.x, goals: Number.isInteger(s.goals) ? s.goals : 0 } : null);
function world(options = {}) {
  let made = 0;
  return liveWorld({
    ...options,
    make: (phone, { clock }) => {
      const changes = vi.fn();
      const newId = () => `${phone.name}${(made += 1)}`;
      const duel = new CanvasDuel({ ft: phone.core.ft, g: "toy", gv: 1, app: "1.0.0", check, clock, onChange: changes, newId });
      return { duel, changes };
    },
  });
}

const duelOf = (w, name) => w.phones[name].made.duel;
const frames = (w, x = () => 0.5) => (phone, now) => {
  const { duel } = phone.made;
  duel.frame(now);
  if (duel.phase === "running") duel.send(duel.raceTime(now), { x: x(phone, now), goals: 0 }, now);
};

async function playing(w, each = frames(w)) {
  duelOf(w, "a").start();
  await w.pass(200, each);
  duelOf(w, "b").start();
  await w.pass(3300, each);
}

describe("the live bridge of a canvas game", () => {
  it("sends nothing when it is made, only when the player starts", async () => {
    const w = world();
    await w.pass(500, frames(w));
    expect(w.phones.a.core.ft.live.send).not.toHaveBeenCalled();
    expect(duelOf(w, "a").status).toMatchObject({ here: false, calling: false, away: false });
    duelOf(w, "a").start();
    expect(decode(w.phones.a.core.sent[0]).k).toBe("hello");
    expect(duelOf(w, "a").status).toMatchObject({ calling: true, here: false });
  });

  it("brings the other phone to its lobby with this player ready, and starts only when both are", async () => {
    const w = world();
    duelOf(w, "a").start();
    await w.pass(200, frames(w));
    expect(duelOf(w, "b").status).toMatchObject({ here: true, ready: { me: false, them: true } });
    expect(duelOf(w, "a").status).toMatchObject({ here: true, ready: { me: true, them: false } });
    await w.pass(2000, frames(w));
    expect(duelOf(w, "a").phase).toBe("lobby");
    duelOf(w, "b").start();
    await w.pass(200, frames(w));
    expect([duelOf(w, "a").phase, duelOf(w, "b").phase]).toEqual(["countdown", "countdown"]);
    expect(duelOf(w, "a").seat + duelOf(w, "b").seat).toBe(1);
    expect(Math.abs(duelOf(w, "a").until(w.clock.now) - duelOf(w, "b").until(w.clock.now))).toBeLessThan(100);
  });

  it("hands the game the other phone's state as its check reads it, and draws it smoothly between arrivals", async () => {
    const w = world({ latency: 30 });
    await playing(w);
    const shown = [];
    await w.pass(
      1500,
      (phone, now) => {
        frames(w, (one, at) => (one.name === "a" ? 0.2 + (at % 1000) / 2000 : 0.5))(phone, now);
        if (phone.name === "b") shown.push(phone.made.duel.other(now)?.x);
      },
      8,
    );
    const b = duelOf(w, "b");
    expect(b.latest).toEqual({ x: expect.any(Number), goals: 0 });
    expect(new Set(shown.filter(Number.isFinite).map((x) => x.toFixed(3))).size).toBeGreaterThan(30);
  });

  it("works out the one-way delay of the wire from both phones' ticks", async () => {
    const w = world({ latency: 60 });
    await playing(w);
    await w.pass(1500, frames(w), 4);
    expect(duelOf(w, "a").clock.latency).toBeGreaterThan(45);
    expect(duelOf(w, "a").clock.latency).toBeLessThan(75);
    expect(duelOf(w, "b").clock.latency).toBeGreaterThan(45);
  });

  it("ignores a state the game's check refuses", async () => {
    const w = world();
    await playing(w, frames(w, () => 7));
    await w.pass(300, frames(w, () => 7));
    expect(duelOf(w, "b").latest).toBeNull();
  });

  it("ends with both phones' final states once both have ended", async () => {
    const w = world();
    await playing(w);
    await w.pass(300, frames(w));
    const a = duelOf(w, "a");
    const b = duelOf(w, "b");
    a.end(a.raceTime(w.clock.now), { x: 0.5, goals: 5 });
    await w.pass(200, frames(w));
    expect(b.latest).toEqual({ x: 0.5, goals: 5 });
    b.end(b.raceTime(w.clock.now), { x: 0.4, goals: 2 });
    await w.pass(200, frames(w));
    expect(a.phase).toBe("over");
    expect(a.result).toEqual({ mine: { x: 0.5, goals: 5 }, theirs: { x: 0.4, goals: 2 } });
    expect(b.result).toEqual({ mine: { x: 0.4, goals: 2 }, theirs: { x: 0.5, goals: 5 } });
  });

  it("says the other is away when it leaves, stops answering or cannot be reached, and says nothing more after a refusal", async () => {
    const w = world();
    await playing(w);
    duelOf(w, "b").leave();
    await w.pass(200, frames(w));
    expect(duelOf(w, "a").phase).toBe("left");
    expect(duelOf(w, "a").status).toMatchObject({ away: true, here: false });

    const quiet = world();
    await playing(quiet);
    quiet.phones.b.closed = true;
    await quiet.pass(7000, frames(quiet));
    expect(duelOf(quiet, "a").status).toMatchObject({ away: true, notice: "silent" });

    const cut = world();
    await playing(cut);
    cut.phones.a.core.reachable = false;
    await cut.pass(300, frames(cut));
    const sent = cut.phones.a.core.sent.length;
    await cut.pass(1000, frames(cut));
    expect(duelOf(cut, "a").status).toMatchObject({ away: true, notice: "unreachable" });
    expect(cut.phones.a.core.sent.length).toBe(sent);
  });

  it("tells the player the other phone does not have the game open when nobody answers", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const w = world();
    w.phones.b.closed = true;
    duelOf(w, "a").start();
    await w.pass(1000, frames(w));
    expect(duelOf(w, "a").status).toMatchObject({ calling: true });
    vi.advanceTimersByTime(8000);
    vi.useRealTimers();
    expect(duelOf(w, "a").status).toMatchObject({ away: true, calling: false, notice: "notOpen" });
  });

  it("starts each new match with a fresh view of the other phone", async () => {
    const w = world();
    await playing(w);
    await w.pass(300, frames(w));
    const a = duelOf(w, "a");
    const b = duelOf(w, "b");
    a.end(a.raceTime(w.clock.now), { x: 0.5, goals: 1 });
    b.end(b.raceTime(w.clock.now), { x: 0.5, goals: 1 });
    await w.pass(200, frames(w));
    a.start();
    await w.pass(200, frames(w));
    b.start();
    await w.pass(200, frames(w));
    expect(b.phase).toBe("countdown");
    expect(b.latest).toBeNull();
    expect(b.other(w.clock.now)).toBeNull();
  });
});
