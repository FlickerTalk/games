// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeCore } from "../../../kit/test/helpers.js";
import { defineColourCorner, roomHeight } from "../src/element.js";
import { say } from "../src/labels.js";
import { memoryStore } from "./harness.js";

defineColourCorner("ft-colourcorner-test");

async function mount(opening = {}) {
  const core = fakeCore();
  const element = document.createElement("ft-colourcorner-test");
  element.ft = { ...core.ft, store: memoryStore() };
  document.body.append(element);
  await core.open({ lang: "es", live: false, ...opening });
  await element.game.idle();
  element.changed();
  return { core, element };
}

const buttons = (element) => [...element.querySelectorAll(".ftc-a11y button")];
const labels = (element) => buttons(element).map((button) => button.getAttribute("aria-label"));

beforeEach(() => {
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("data-fill");
});
afterEach(() => vi.restoreAllMocks());

describe("the Colour Corner element", () => {
  it("draws on one canvas and names it in the player's language", async () => {
    const { element } = await mount();
    const canvas = element.querySelector("canvas");
    expect(canvas.getAttribute("role")).toBe("img");
    expect(canvas.getAttribute("aria-label")).toBe(say("es", "canvas"));
  });

  it("lays a named button over everything the canvas lets the player touch", async () => {
    const { element } = await mount();
    expect(labels(element)).toEqual(expect.arrayContaining([say("es", "play"), say("es", "pages"), say("es", "free"), say("es", "looks"), "Sonido"]));
    buttons(element).find((button) => button.getAttribute("aria-label") === say("es", "play")).click();
    await element.game.idle();
    element.changed();
    expect(element.game.state.screen).toBe("shelf");
    expect(labels(element)).toContain(say("es", "page_cat"));
    expect(labels(element)).toContain(say("es", "back"));
  });

  it("is as tall as the conversation's room leaves, and fills the frame in full screen", async () => {
    const { element } = await mount();
    expect(element.style.height).toBe(`${roomHeight(globalThis.screen.height || 853)}px`);
    document.documentElement.setAttribute("data-fill", "1");
    element.measure();
    expect(element.style.height).toBe("");
  });

  it("never touches the live channel when colouring with FlickerTalk", async () => {
    const { core, element } = await mount({ solo: true });
    element.game.state.variant = "together";
    buttons(element).find((button) => button.getAttribute("aria-label") === say("es", "play")).click();
    await element.game.idle();
    expect(["shelf", "duo"]).toContain(element.game.state.screen);
    expect(core.ft.live.send).not.toHaveBeenCalled();
  });

  it("lets go of its loop and its sound when it leaves the page", async () => {
    const { element } = await mount();
    const close = vi.spyOn(element.sound, "close");
    element.remove();
    expect(close).toHaveBeenCalled();
  });
});
