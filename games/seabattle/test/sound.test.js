import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TIMING } from "../../../kit/src/table.js";
import { fakeCore, settle, within } from "../../../kit/test/helpers.js";
import { game } from "../src/index.js";

const tick = () => settle([...document.querySelectorAll("ft-seabattle")].map((element) => element.table));
const names = (spy) => spy.mock.calls.map(([name]) => name);

async function solo() {
  const core = fakeCore();
  const element = document.createElement("ft-seabattle");
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
  await tick();
}

async function toMyShot(element) {
  for (let step = 0; step < 6; step += 1) {
    const { state, myTurn } = element.table.view;
    if (myTurn && state.phase === "fire") return;
    if (myTurn) await touch(element, '[data-act="ready"]');
    else {
      await vi.advanceTimersByTimeAsync(TIMING.think);
      await tick();
    }
  }
}

beforeEach(() => {
  vi.useFakeTimers({ toNotFake: ["Date"] });
  document.body.innerHTML = "";
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("the sound of Sea Battle", () => {
  it("plays the calm tune during a match, with the speaker in the bar beside the way back and the music switch on its line", async () => {
    const music = vi.spyOn(game.sound, "music");
    const { element } = await solo();
    await touch(element, '[data-kit="new"]');
    expect(music).toHaveBeenLastCalledWith("calm");
    const group = element.querySelector('[data-part="bar"] > .ftg-sound-buttons');
    expect(group.previousElementSibling.querySelector('[data-kit="back"]')).not.toBeNull();
    expect(element.querySelector('.ftg-volume [data-sound="music"]')).not.toBeNull();
  });

  it("answers the tap that aims, then sounds each shot as it is made, the user's and the phone's apart", async () => {
    const played = vi.spyOn(game.sound, "play");
    const { element, core } = await solo();
    await touch(element, '[data-kit="new"]');
    await toMyShot(element);
    played.mockClear();
    const free = [...element.querySelectorAll("button[data-cell]")].find((one) => !one.disabled);
    await touch(element, Number(free.dataset.cell));
    expect(names(played)).toEqual(["tap"]);
    await touch(element, "[data-ghost]");
    expect(names(played)).toEqual(["tap", "place"]);
    await vi.advanceTimersByTimeAsync(TIMING.think);
    await tick();
    expect(names(played)).toEqual(["tap", "place", "pop"]);
    expect(core.ft.live.send).not.toHaveBeenCalled();
  });

  it("is in Sea Battle's package", () => {
    expect(readFileSync(join(import.meta.dirname, "..", "dist", "index.js"), "utf8")).toContain("ftg-sound-buttons");
  });
});
