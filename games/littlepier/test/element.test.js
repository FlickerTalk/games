// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeCore } from "../../../kit/test/helpers.js";
import { ROOM_CHROME } from "../../../kit/src/stage.js";
import { SEA, defineLittlePier, roomHeight } from "../src/element.js";
import { memoryStore } from "./harness.js";

defineLittlePier("ft-littlepier-test");

async function mount(opening = {}) {
  const core = fakeCore();
  const element = document.createElement("ft-littlepier-test");
  element.ft = { ...core.ft, store: memoryStore() };
  document.body.append(element);
  await core.open({ lang: "es", live: false, ...opening });
  await element.game.idle();
  return { core, element };
}

const buttons = (element) => [...element.querySelectorAll(".ftc-a11y button")];
const named = (element, label) => buttons(element).find((button) => button.getAttribute("aria-label") === label);

beforeEach(() => {
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("data-fill");
});
afterEach(() => vi.restoreAllMocks());

describe("the Little Pier element", () => {
  it("draws on one canvas and names it in the player's language", async () => {
    const { element } = await mount();
    const canvas = element.querySelector("canvas");
    expect(canvas.getAttribute("role")).toBe("img");
    expect(canvas.getAttribute("aria-label")).toMatch(/^Little Pier: mantén pulsada el agua/);
  });

  it("lays a named button over everything the canvas lets the player touch, the water included", async () => {
    const { element } = await mount();
    const labels = buttons(element).map((button) => button.getAttribute("aria-label"));
    for (const label of ["Jugar", "Álbum de cromos", "Sonido"]) expect(labels).toContain(label);
    named(element, "Jugar").click();
    await element.game.idle();
    expect(element.game.state.screen).toBe("play");
    const playing = buttons(element).map((button) => button.getAttribute("aria-label"));
    expect(playing).toContain("Pausa");
    expect(playing).toContain("Pescar: mantén pulsado para bajar el anzuelo y suelta para subirlo");
  });

  it("is as tall as the conversation's room leaves, and fills the frame in full screen", async () => {
    expect(roomHeight(853)).toBe(853 - ROOM_CHROME);
    const { element } = await mount();
    expect(element.style.height).toBe(`${roomHeight(globalThis.screen.height || 853)}px`);
    document.documentElement.setAttribute("data-fill", "1");
    element.measure();
    expect(element.style.height).toBe("");
  });

  it("never touches the live channel when fishing with FlickerTalk", async () => {
    const { core, element } = await mount({ solo: true });
    named(element, "Jugar").click();
    await element.game.idle();
    expect(element.game.state.screen).toBe("play");
    expect(element.game.state.round.hooks).toHaveLength(2);
    expect(core.ft.live.send).not.toHaveBeenCalled();
  });

  it("makes the sea a soft, slow noise that the kit keeps under the music", () => {
    expect(SEA.length).toBeGreaterThan(0);
    for (const voice of SEA) {
      expect(voice.wave).toBe("noise");
      expect(voice.gain).toBeLessThanOrEqual(0.5);
      expect(voice.wobble.rate).toBeLessThan(3);
    }
  });

  it("lets go of its loop and its sound when it leaves the page", async () => {
    const { element } = await mount();
    const close = vi.spyOn(element.sound, "close");
    element.remove();
    expect(close).toHaveBeenCalled();
  });
});
