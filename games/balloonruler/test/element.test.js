// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeCore } from "../../../kit/test/helpers.js";
import { ROOM_CHROME } from "../../../kit/src/stage.js";
import { defineBalloonRuler, roomHeight } from "../src/element.js";
import { memoryStore } from "./harness.js";

defineBalloonRuler("ft-balloonruler-test");

async function mount(opening = {}) {
  const core = fakeCore();
  const element = document.createElement("ft-balloonruler-test");
  element.ft = { ...core.ft, store: memoryStore() };
  document.body.append(element);
  await core.open({ lang: "es", live: false, ...opening });
  await element.game.idle();
  return { core, element };
}

const buttons = (element) => [...element.querySelectorAll(".ftc-a11y button")];
const labels = (element) => buttons(element).map((button) => button.getAttribute("aria-label"));
const named = (element, label) => buttons(element).find((button) => button.getAttribute("aria-label") === label);

beforeEach(() => {
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("data-fill");
});
afterEach(() => vi.restoreAllMocks());

describe("the Balloon Ruler element", () => {
  it("draws on one canvas and names it in the player's language", async () => {
    const { element } = await mount();
    const canvas = element.querySelector("canvas");
    expect(canvas.getAttribute("role")).toBe("img");
    expect(canvas.getAttribute("aria-label")).toMatch(/^Regla de globos: /);
    expect(canvas.getAttribute("aria-label")).toMatch(/regla/);
  });

  it("lays a named button over everything the canvas lets the player touch, the parts of the ruler included", async () => {
    const { element } = await mount();
    for (const label of ["Jugar", "Sonido"]) expect(labels(element)).toContain(label);
    named(element, "Jugar").click();
    await element.game.idle();
    expect(element.game.state.screen).toBe("play");
    expect(labels(element)).toContain("Pausa");
    const parts = labels(element).filter((label) => /regla/i.test(label));
    expect(parts.length).toBe(element.game.state.layout.slices);
    expect(new Set(parts).size).toBe(parts.length);
    buttons(element).find((button) => /regla/i.test(button.getAttribute("aria-label"))).click();
    expect(element.game.state.round.shot).not.toBeNull();
  });

  it("is as tall as the conversation's room leaves, and fills the frame in full screen", async () => {
    expect(roomHeight(853)).toBe(853 - ROOM_CHROME);
    const { element } = await mount();
    expect(element.style.height).toBe(`${roomHeight(globalThis.screen.height || 853)}px`);
    document.documentElement.setAttribute("data-fill", "1");
    element.measure();
    expect(element.style.height).toBe("");
  });

  it("never touches the live channel when playing with FlickerTalk", async () => {
    const { core, element } = await mount({ solo: true });
    named(element, "Jugar").click();
    await element.game.idle();
    expect(element.game.state.round.rival).toBe(true);
    expect(core.ft.live.send).not.toHaveBeenCalled();
  });

  it("lets go of its loop and its sound when it leaves the page", async () => {
    const { element } = await mount();
    const close = vi.spyOn(element.sound, "close");
    element.remove();
    expect(close).toHaveBeenCalled();
  });
});
