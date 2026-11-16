import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TIMING } from "../../../kit/src/table.js";
import { fakeCore, settle, within } from "../../../kit/test/helpers.js";
import { game } from "../src/index.js";

const tick = () => settle([...document.querySelectorAll("ft-gomoku")].map((element) => element.table));
const names = (spy) => spy.mock.calls.map(([name]) => name);
const free = (element) => element.table.view.state.cells.findIndex((one) => one === null);

async function solo() {
  const core = fakeCore();
  const element = document.createElement("ft-gomoku");
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

describe("the sound of Five in a Row", () => {
  it("plays the calm tune during a match, with the speaker in the bar beside the way back and the music switch on its line", async () => {
    const music = vi.spyOn(game.sound, "music");
    const { element } = await solo();
    await touch(element, '[data-kit="new"]');
    expect(music).toHaveBeenLastCalledWith("calm");
    const group = element.querySelector('[data-part="bar"] > .ftg-sound-buttons');
    expect(group.previousElementSibling.querySelector('[data-kit="back"]')).not.toBeNull();
    expect(element.querySelector('.ftg-volume [data-sound="music"]')).not.toBeNull();
  });

  it("answers the choice of a crossing and a tap on a stone, then sounds each stone as it lands, the user's and the phone's apart", async () => {
    const played = vi.spyOn(game.sound, "play");
    const { element, core } = await solo();
    await touch(element, '[data-kit="new"]');
    await vi.advanceTimersByTimeAsync(TIMING.think);
    await tick();
    expect(names(played)).toEqual(["pop"]);
    await touch(element, 112);
    expect(names(played)).toEqual(["pop", "error-soft"]);
    const cell = free(element);
    await touch(element, cell);
    expect(names(played)).toEqual(["pop", "error-soft", "tap"]);
    await touch(element, "[data-ghost]");
    expect(names(played)).toEqual(["pop", "error-soft", "tap", "place"]);
    await vi.advanceTimersByTimeAsync(TIMING.think);
    await tick();
    expect(names(played)).toEqual(["pop", "error-soft", "tap", "place", "pop"]);
    expect(core.ft.live.send).not.toHaveBeenCalled();
  });

  it("is in Five in a Row's package", () => {
    expect(readFileSync(join(import.meta.dirname, "..", "dist", "index.js"), "utf8")).toContain("ftg-sound-buttons");
  });
});
