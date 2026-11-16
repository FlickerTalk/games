import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TIMING } from "../../../kit/src/table.js";
import { fakeCore, settle, within } from "../../../kit/test/helpers.js";
import { game } from "../src/index.js";

const tick = () => settle([...document.querySelectorAll("ft-tictactoe")].map((element) => element.table));
const names = (spy) => spy.mock.calls.map(([name]) => name);

async function solo() {
  const core = fakeCore();
  const element = document.createElement("ft-tictactoe");
  element.ft = core.ft;
  document.body.append(element);
  await core.open({ live: false, solo: true });
  await tick();
  element.table.random = () => new Uint8Array(32);
  return element;
}

async function touch(element, target) {
  const node = typeof target === "number" ? element.querySelector(`[data-cell="${target}"]`) : within(element, target);
  node.click();
  await tick();
}

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = "";
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("Tic-Tac-Toe's sound", () => {
  it("plays the calm tune during a match, with the speaker in the bar beside the way back and the music switch on its line", async () => {
    const music = vi.spyOn(game.sound, "music");
    const element = await solo();
    await touch(element, '[data-kit="new"]');
    expect(music).toHaveBeenLastCalledWith("calm");
    const group = element.querySelector('[data-part="bar"] > .ftg-sound-buttons');
    expect(group.previousElementSibling.querySelector('[data-kit="back"]')).not.toBeNull();
    expect(element.querySelector('.ftg-volume [data-sound="music"]')).not.toBeNull();
  });

  it("sounds each mark as it lands, the user's and the phone's apart, and the end of the round", async () => {
    const played = vi.spyOn(game.sound, "play");
    const element = await solo();
    await touch(element, '[data-kit="new"]');
    await touch(element, 4);
    expect(names(played)).toEqual(["place"]);
    await vi.advanceTimersByTimeAsync(TIMING.think);
    await tick();
    expect(names(played)).toEqual(["place", "pop"]);
    for (let turn = 0; element.table.view.phase === "play" && turn < 9; turn += 1) {
      const free = [...element.querySelectorAll("[data-cell]")].find((node) => !node.disabled && !node.querySelector("svg"));
      await touch(element, Number(free.dataset.cell));
      await vi.advanceTimersByTimeAsync(TIMING.think);
      await tick();
    }
    const { winner } = element.table.view.result;
    const end = winner === null ? "star" : winner === element.table.record.me ? "win" : "lose-soft";
    expect(names(played).at(-1)).toBe(end);
    expect(names(played).filter((name) => ["place", "pop"].includes(name)).length).toBe(element.table.view.round.moves.length);
  });

  it("is in Tic-Tac-Toe's package, and in no game that does not ask for sound", () => {
    const games = join(import.meta.dirname, "..", "..");
    const src = (name) => readdirSync(join(games, name, "src")).map((file) => readFileSync(join(games, name, "src", file), "utf8"));
    const dist = (name) => readFileSync(join(games, name, "dist", "index.js"), "utf8");
    expect(dist("tictactoe")).toContain("ftg-sound-buttons");
    const silent = readdirSync(games).filter((name) => !src(name).some((code) => code.includes("sound/index.js")));
    expect(silent.length).toBeGreaterThan(0);
    for (const name of silent) {
      expect(dist(name), name).not.toContain("ftg-sound-buttons");
      expect(dist(name), name).not.toContain("lose-soft");
    }
  });
});
