// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeCore } from "../../../kit/test/helpers.js";
import { ROOM_CHROME } from "../../../kit/src/stage.js";
import { defineShardSplitter, roomHeight } from "../src/element.js";
import { memoryStore } from "./harness.js";

defineShardSplitter("ft-shardsplitter-test");

async function mount(opening = {}) {
  const core = fakeCore();
  const element = document.createElement("ft-shardsplitter-test");
  element.ft = { ...core.ft, store: memoryStore() };
  document.body.append(element);
  await core.open({ lang: "es", live: false, ...opening });
  await element.game.idle();
  return { core, element };
}

const buttons = (element) => [...element.querySelectorAll(".ftc-a11y button")];
const labels = (element) => buttons(element).map((button) => button.getAttribute("aria-label"));
const press = async (element, label) => {
  buttons(element).find((button) => button.getAttribute("aria-label") === label).click();
  await element.game.idle();
};

beforeEach(() => {
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("data-fill");
});
afterEach(() => vi.restoreAllMocks());

describe("the Shard Splitter element", () => {
  it("draws on one canvas and names it in the player's language", async () => {
    const { element } = await mount();
    const canvas = element.querySelector("canvas");
    expect(canvas.getAttribute("role")).toBe("img");
    expect(canvas.getAttribute("aria-label")).toMatch(/^Rompecristales: toca un divisor/);
  });

  it("lays a named button over everything the canvas lets the player touch", async () => {
    const { element } = await mount();
    expect(labels(element)).toEqual(expect.arrayContaining(["Jugar", "Elige tu jugador", "Mazos y lugares", "Sonido"]));
    await press(element, "Jugar");
    expect(element.game.state.screen).toBe("play");
    expect(labels(element)).toEqual(expect.arrayContaining(["Pausa", "Sonido"]));
    expect(labels(element).filter((label) => /^Dividir \d+ entre \d+$/.test(label))).toHaveLength(3);
  });

  it("lets the golem be split from the keyboard, each button saying the number it would divide now", async () => {
    const { element } = await mount();
    await press(element, "Jugar");
    const { round } = element.game.state;
    round.busyUntil = 0;
    const before = round.core.value;
    const divisor = round.core.hands[0].find((one) => before % one === 0);
    await press(element, `Dividir ${before} entre ${divisor}`);
    expect(element.game.state.round.hits).toEqual([divisor]);
    const { core } = element.game.state.round;
    expect(core.value).not.toBe(before);
    expect(labels(element).filter((label) => label.startsWith(`Dividir ${core.value} entre `))).toHaveLength(3);
  });

  it("is as tall as the conversation's room leaves, and fills the frame in full screen", async () => {
    expect(roomHeight(853)).toBe(853 - ROOM_CHROME);
    const { element } = await mount();
    expect(element.style.height).toBe(`${roomHeight(globalThis.screen.height || 853)}px`);
    document.documentElement.setAttribute("data-fill", "1");
    element.measure();
    expect(element.style.height).toBe("");
  });

  it("never touches the live channel when played with FlickerTalk", async () => {
    const { core, element } = await mount({ solo: true });
    await press(element, "Jugar");
    expect(element.game.state.screen).toBe("play");
    expect(element.game.state.round.kind).toBe("flick");
    expect(core.ft.live.send).not.toHaveBeenCalled();
  });

  it("carries its own clink and giggle, and lets go of its loop and its sound when it leaves the page", async () => {
    const { element } = await mount();
    const close = vi.spyOn(element.sound, "close");
    element.remove();
    expect(close).toHaveBeenCalled();
  });
});
