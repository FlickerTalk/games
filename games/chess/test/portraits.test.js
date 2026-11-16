import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { standIn } from "../../../kit/src/avatars/portraits.js";
import { fakeCore, phones, settle, within } from "../../../kit/test/helpers.js";
import "../src/index.js";

const tick = () => settle([...document.querySelectorAll("ft-chess")].map((element) => element.table));
const portrait = (element, side) => element.querySelector(`.ftg-bar canvas[data-side="${side}"]`);

function remember(core, player) {
  core.ft.store = { get: async (key) => (key === "player" ? JSON.stringify(player) : null), set: async () => true, forget: async () => true };
  return core;
}

async function phone(core, opening = {}) {
  const element = document.createElement("ft-chess");
  element.ft = core.ft;
  document.body.append(element);
  await core.open(opening);
  await tick();
  return element;
}

async function touch(element, target) {
  const node = /^[a-h][1-8]$/.test(target) ? element.querySelector(`button[data-square="${target}"]`) : within(element, target);
  node.click();
  await tick();
}

beforeEach(() => {
  vi.useFakeTimers({ toNotFake: ["Date"] });
  document.body.innerHTML = "";
});
afterEach(() => vi.useRealTimers());

describe("the portraits of chess", () => {
  it("show the user's avatar and Flick beside the score against the phone, Flick thinking on its move", async () => {
    const core = remember(fakeCore(), { who: "milo", hair: "quiff", hairColour: "copper", name: "Lia" });
    const one = await phone(core, { live: false, solo: true });
    one.table.random = () => new Uint8Array(32);
    await touch(one, '[data-kit="new"]');
    const score = one.querySelector('.ftg-bar [data-part="score"]');
    expect([score.previousElementSibling, score.nextElementSibling]).toEqual([portrait(one, "me"), portrait(one, "them")]);
    expect([portrait(one, "me").dataset.who, portrait(one, "them").dataset.who]).toEqual(["milo", "flick"]);
    expect(one.table.view.myTurn).toBe(true);
    expect(portrait(one, "me").dataset.face).toBe("focused");
    await touch(one, "e2");
    await touch(one, "e4");
    expect(portrait(one, "them").dataset.face).toBe("thinking");
    expect(core.ft.live.send).not.toHaveBeenCalled();
  });

  it("show another profile, never Flick, for a person, and leave with the match", async () => {
    const { a, b } = phones();
    remember(a, { who: "sam", hair: "braids" });
    const one = await phone(a);
    await phone(b);
    await touch(one, '[data-kit="new"]');
    await tick();
    expect(portrait(one, "me").dataset.who).toBe("sam");
    expect(portrait(one, "them").dataset.who).toBe(standIn({ who: "sam" }).who);
    await touch(one, '[data-kit="back"]');
    expect(one.querySelectorAll(".ftg-bar canvas")).toHaveLength(0);
  });
});
