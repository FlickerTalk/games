import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TIMING } from "../../../kit/src/table.js";
import { fakeCore, settle, within } from "../../../kit/test/helpers.js";
import { game } from "../src/index.js";
import { wordOf } from "../src/picking.js";
import { accepted, pathOf, wordsOn } from "../src/rules.js";

const tick = () => settle([...document.querySelectorAll("ft-wordgrid")].map((element) => element.table));
const names = (spy) => spy.mock.calls.map(([name]) => name);

async function solo() {
  const core = fakeCore();
  globalThis.ft = { store: { get: async () => null, set: async () => true } };
  const element = document.createElement("ft-wordgrid");
  element.ft = core.ft;
  document.body.append(element);
  await core.open({ live: false, solo: true });
  await tick();
  element.table.random = () => new Uint8Array(32).fill(1);
  return { element, core };
}

async function touch(element, selector) {
  within(element, selector).click();
  await tick();
}

const tap = (element, cell) => touch(element, `[data-cell="${cell}"]`);

async function myTurn(element) {
  for (let wait = 0; wait < 12 && !(element.table.view.myTurn && element.table.view.state.phase === "play"); wait += 1) {
    await vi.advanceTimersByTimeAsync(TIMING.think);
    await tick();
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = "";
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  delete globalThis.ft;
});

describe("the sound of Letter Grid", () => {
  it("plays the calm tune during a match, with the speaker in the bar beside the way back and the music switch on its line", async () => {
    const music = vi.spyOn(game.sound, "music");
    const { element } = await solo();
    await touch(element, '[data-kit="new"]');
    expect(music).toHaveBeenLastCalledWith("calm");
    const group = element.querySelector('[data-part="bar"] > .ftg-sound-buttons');
    expect(group.previousElementSibling.querySelector('[data-kit="back"]')).not.toBeNull();
    expect(element.querySelector('.ftg-volume [data-sound="music"]')).not.toBeNull();
  });

  it("answers the touch of a tile, sounds a word that will not do softly, and each word or pass as it lands, the user's and the phone's apart", async () => {
    const played = vi.spyOn(game.sound, "play");
    const { element, core } = await solo();
    await touch(element, '[data-kit="new"]');
    await myTurn(element);
    const { grid, lang, said } = element.table.view.state;
    const nonsense = [[0, 1, 2], [2, 1, 0], [0, 4, 8], [8, 4, 0]].find((path) => !accepted(lang, wordOf(grid, path)));
    played.mockClear();
    for (const cell of nonsense) await tap(element, cell);
    expect(names(played)).toEqual(["tap", "tap", "tap"]);
    await touch(element, '[data-act="say"]');
    expect(names(played).at(-1)).toBe("error-soft");
    await tap(element, nonsense[0]);
    played.mockClear();
    const word = wordsOn(grid, lang).find((one) => !said[0].includes(one) && !said[1].includes(one));
    if (word) {
      for (const cell of pathOf(grid, word)) await tap(element, cell);
      await touch(element, '[data-act="say"]');
    } else await touch(element, '[data-act="pass"]');
    expect(names(played).at(-1)).toBe("place");
    await vi.advanceTimersByTimeAsync(TIMING.think);
    await tick();
    expect(names(played).at(-1)).toBe("pop");
    expect(core.ft.live.send).not.toHaveBeenCalled();
  });

  it("is in Letter Grid's package", () => {
    expect(readFileSync(join(import.meta.dirname, "..", "dist", "index.js"), "utf8")).toContain("ftg-sound-buttons");
  });
});
