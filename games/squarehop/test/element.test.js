// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeCore } from "../../../kit/test/helpers.js";
import { ROOM_CHROME } from "../../../kit/src/stage.js";
import { defineSquareHop, roomHeight } from "../src/element.js";
import { TIMES } from "../src/round.js";
import { memoryStore } from "./harness.js";

defineSquareHop("ft-squarehop-test");

async function mount(opening = {}) {
  const core = fakeCore();
  const element = document.createElement("ft-squarehop-test");
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

describe("the Square Hop Rally element", () => {
  it("draws on one canvas and names it in the player's language", async () => {
    const { element } = await mount();
    const canvas = element.querySelector("canvas");
    expect(canvas.getAttribute("role")).toBe("img");
    expect(canvas.getAttribute("aria-label")).toMatch(/^Square Hop Rally: en tu turno/);
  });

  it("lays a named button over everything the canvas lets the player touch, the dice by what they show", async () => {
    const { element } = await mount({ solo: true });
    expect(labels(element)).toEqual(expect.arrayContaining(["Jugar", "FlickerTalk", "Sonido"]));
    await press(element, "Jugar");
    expect(element.game.state.screen).toBe("play");
    const { round } = element.game.state;
    round.rolledAt = element.game.now() - TIMES.roll - 1;
    element.changed();
    const [first, second] = round.dice;
    expect(labels(element)).toEqual(expect.arrayContaining([`Saltar ${first} casillas`, `Saltar ${second} casillas`, "Pausa"]));
    await press(element, `Saltar ${second} casillas`);
    expect(element.game.state.round.picks).toEqual([1]);
  });

  it("is as tall as the conversation's room leaves, and fills the frame in full screen", async () => {
    expect(roomHeight(853)).toBe(853 - ROOM_CHROME);
    const { element } = await mount();
    expect(element.style.height).toBe(`${roomHeight(globalThis.screen.height || 853)}px`);
    document.documentElement.setAttribute("data-fill", "1");
    element.measure();
    expect(element.style.height).toBe("");
  });

  it("never touches the live channel when played against FlickerTalk", async () => {
    const { core, element } = await mount({ solo: true });
    await press(element, "Jugar");
    expect(element.game.state.screen).toBe("play");
    expect(core.ft.live.send).not.toHaveBeenCalled();
  });

  it("lets go of its loop and its sound when it leaves the page", async () => {
    const { element } = await mount();
    const close = vi.spyOn(element.sound, "close");
    element.remove();
    expect(close).toHaveBeenCalled();
  });
});
