import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TIMING } from "../../../kit/src/table.js";
import { fakeCore, settle, within } from "../../../kit/test/helpers.js";
import { game } from "../src/index.js";
import { legalMoves } from "../src/rules.js";

const tick = () => settle([...document.querySelectorAll("ft-checkers")].map((element) => element.table));
const names = (spy) => spy.mock.calls.map(([name]) => name);

async function solo() {
  const core = fakeCore();
  const element = document.createElement("ft-checkers");
  element.ft = core.ft;
  document.body.append(element);
  await core.open({ live: false, solo: true });
  await tick();
  element.table.random = () => new Uint8Array(32).fill(1);
  return { element, core };
}

async function touch(element, target) {
  const node = typeof target === "number" ? element.querySelector(`button[data-cell="${target}"]`) : within(element, target);
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

describe("the sound of checkers", () => {
  it("plays the calm tune during a match, with the speaker in the bar beside the way back and the music switch on its line", async () => {
    const music = vi.spyOn(game.sound, "music");
    const { element } = await solo();
    await touch(element, '[data-kit="new"]');
    expect(music).toHaveBeenLastCalledWith("calm");
    const group = element.querySelector('[data-part="bar"] > .ftg-sound-buttons');
    expect(group.previousElementSibling.querySelector('[data-kit="back"]')).not.toBeNull();
    expect(element.querySelector('.ftg-volume [data-sound="music"]')).not.toBeNull();
  });

  it("answers the touch of a piece, then sounds each move as it lands, the user's and the phone's apart", async () => {
    const played = vi.spyOn(game.sound, "play");
    const { element, core } = await solo();
    await touch(element, '[data-kit="new"]');
    await vi.advanceTimersByTimeAsync(TIMING.think);
    await tick();
    expect(names(played)).toEqual(["pop"]);
    const [from, to] = legalMoves(element.table.view.state, element.table.view.mySide)[0].split("-").map(Number);
    await touch(element, from);
    expect(names(played)).toEqual(["pop", "tap"]);
    await touch(element, to);
    expect(names(played)).toEqual(["pop", "tap", "place"]);
    await vi.advanceTimersByTimeAsync(TIMING.think);
    await tick();
    expect(names(played)).toEqual(["pop", "tap", "place", "pop"]);
    expect(core.ft.live.send).not.toHaveBeenCalled();
  });

  it("is in Checkers' package", () => {
    expect(readFileSync(join(import.meta.dirname, "..", "dist", "index.js"), "utf8")).toContain("ftg-sound-buttons");
  });
});
