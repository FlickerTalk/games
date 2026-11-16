import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TIMING } from "../../../kit/src/table.js";
import { fakeCore, settle, within } from "../../../kit/test/helpers.js";
import { game } from "../src/index.js";

const tick = () => settle([...document.querySelectorAll("ft-dotsandboxes")].map((element) => element.table));
const names = (spy) => spy.mock.calls.map(([name]) => name);

async function solo() {
  const core = fakeCore();
  const element = document.createElement("ft-dotsandboxes");
  element.ft = core.ft;
  document.body.append(element);
  await core.open({ live: false, solo: true });
  await tick();
  element.table.random = () => new Uint8Array(32).fill(1);
  return { element, core };
}

async function touch(element, target) {
  const node = typeof target === "number" ? element.querySelector(`button[data-line="${target}"]`) : within(element, target);
  node.click();
  await tick();
}

beforeEach(() => {
  vi.useFakeTimers({ toNotFake: ["Date"] });
  document.body.innerHTML = "";
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("the sound of dots and boxes", () => {
  it("plays the calm tune during a match, with the speaker in the bar beside the way back and the music switch on its line", async () => {
    const music = vi.spyOn(game.sound, "music");
    const { element } = await solo();
    await touch(element, '[data-kit="new"]');
    expect(music).toHaveBeenLastCalledWith("calm");
    const group = element.querySelector('[data-part="bar"] > .ftg-sound-buttons');
    expect(group.previousElementSibling.querySelector('[data-kit="back"]')).not.toBeNull();
    expect(element.querySelector('.ftg-volume [data-sound="music"]')).not.toBeNull();
  });

  it("sounds each line as it is drawn, the user's and the phone's apart", async () => {
    const played = vi.spyOn(game.sound, "play");
    const { element, core } = await solo();
    await touch(element, '[data-kit="new"]');
    await vi.advanceTimersByTimeAsync(TIMING.think);
    await tick();
    const opened = element.table.record.game.moves.length ? ["pop"] : [];
    expect(names(played)).toEqual(opened);
    const free = element.table.view.state.lines.findIndex((drawn) => !drawn);
    await touch(element, free);
    expect(names(played)).toEqual([...opened, "place"]);
    await vi.advanceTimersByTimeAsync(TIMING.think);
    await tick();
    expect(names(played)).toEqual([...opened, "place", "pop"]);
    expect(core.ft.live.send).not.toHaveBeenCalled();
  });

  it("is in Dots and Boxes' package", () => {
    expect(readFileSync(join(import.meta.dirname, "..", "dist", "index.js"), "utf8")).toContain("ftg-sound-buttons");
  });
});
