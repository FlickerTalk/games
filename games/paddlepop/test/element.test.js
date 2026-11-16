import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ROOM_CHROME } from "../../../kit/src/stage.js";
import { fakeCore } from "../../../kit/test/helpers.js";
import { definePaddlePop } from "../src/element.js";
import { TEXTS } from "../src/texts.js";
import { memoryStore } from "./harness.js";

definePaddlePop("ft-paddlepop-test");

async function mount(opening = {}) {
  const core = fakeCore();
  const element = document.createElement("ft-paddlepop-test");
  element.ft = { ...core.ft, store: memoryStore() };
  document.body.append(element);
  await core.open({ lang: "es", live: false, ...opening });
  await element.game.idle();
  return { core, element };
}

const labels = (element) => [...element.querySelectorAll(".ftc-a11y button")].map((button) => button.getAttribute("aria-label"));
const button = (element, label) => [...element.querySelectorAll(".ftc-a11y button")].find((one) => one.getAttribute("aria-label") === label);

beforeEach(() => {
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("data-fill");
});
afterEach(() => vi.restoreAllMocks());

describe("the Paddle Pop element", () => {
  it("draws on one canvas named in the player's language, with the gesture in its name", async () => {
    const { element } = await mount({ solo: true });
    const canvas = element.querySelector("canvas");
    expect(canvas.getAttribute("role")).toBe("img");
    expect(canvas.getAttribute("aria-label")).toBe(TEXTS.es.canvas);
  });

  it("lays a named button over everything the canvas lets the player touch", async () => {
    const { element } = await mount({ solo: true });
    expect(labels(element)).toEqual(expect.arrayContaining([TEXTS.es.play, TEXTS.es.looks, "FlickerTalk", "Sonido", "Música"]));
    button(element, TEXTS.es.play).click();
    await element.game.idle();
    expect(element.game.state.screen).toBe("play");
    expect(labels(element)).toContain(TEXTS.es.pause);
  });

  it("is as tall as the conversation's room leaves, and fills the frame in full screen", async () => {
    const { element } = await mount({ solo: true });
    expect(element.style.height).toBe(`${Math.max(300, (globalThis.screen.height || 853) - ROOM_CHROME)}px`);
    document.documentElement.setAttribute("data-fill", "1");
    element.measure();
    expect(element.style.height).toBe("");
  });

  it("never touches the live channel against FlickerTalk", async () => {
    const { core, element } = await mount({ solo: true });
    button(element, TEXTS.es.play).click();
    await element.game.idle();
    await core.hear("anything");
    expect(core.ft.live.send).not.toHaveBeenCalled();
    expect(element.game.duel).toBeNull();
  });

  it("listens to the other phone in a chat, sends nothing when it opens, and says goodbye when it leaves the page", async () => {
    const { core, element } = await mount({ live: true });
    expect(element.game.duel).not.toBeNull();
    expect(core.ft.live.send).not.toHaveBeenCalled();
    button(element, TEXTS.es.play).click();
    expect(core.ft.live.send).toHaveBeenCalledTimes(1);
    const close = vi.spyOn(element.sound, "close");
    element.remove();
    expect(close).toHaveBeenCalled();
    expect(core.ft.live.send).toHaveBeenCalledTimes(2);
  });
});
