// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeCore } from "../../../kit/test/helpers.js";
import { defineGoalSwipe } from "../src/element.js";
import { memoryStore } from "./harness.js";

defineGoalSwipe("ft-goalswipe-test");

async function mount(opening = {}) {
  const core = fakeCore();
  const element = document.createElement("ft-goalswipe-test");
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

describe("the Goal Swipe element", () => {
  it("draws on one canvas and names it in the player's language", async () => {
    const { element } = await mount();
    const canvas = element.querySelector("canvas");
    expect(canvas.getAttribute("role")).toBe("img");
    expect(canvas.getAttribute("aria-label")).toMatch(/^Goal Swipe: desliza/);
  });

  it("lays a named button over everything the canvas lets the player touch, the three ways to shoot included", async () => {
    const { element } = await mount({ solo: true });
    expect(labels(element)).toEqual(expect.arrayContaining(["Jugar", "Sonido", "Música", "FlickerTalk", "Elige tu jugador", "Balones y campos"]));
    button(element, "Jugar").click();
    await element.game.idle();
    element.game.frame(performance.now());
    element.changed();
    expect(element.game.state.screen).toBe("play");
    expect(labels(element)).toEqual(expect.arrayContaining(["Pausa", "Chutar a la izquierda", "Chutar al centro", "Chutar a la derecha"]));
    button(element, "Chutar a la izquierda").click();
    expect(element.game.state.round.kick.phase).toBe("fly");
  });

  it("offers the two ways to play outside a chat", async () => {
    const { element } = await mount({ chat: undefined });
    expect(labels(element)).toEqual(expect.arrayContaining(["Jugar contra FlickerTalk", "Dos jugadores en este dispositivo"]));
  });

  it("never touches the live channel when played against FlickerTalk", async () => {
    const { core, element } = await mount({ solo: true });
    button(element, "Jugar").click();
    await element.game.idle();
    expect(element.game.state.screen).toBe("play");
    expect(core.ft.live.send).not.toHaveBeenCalled();
  });

  it("says nothing to the other phone just because it opened in a chat", async () => {
    const { core } = await mount({ live: true });
    expect(core.ft.live.send).not.toHaveBeenCalled();
  });

  it("lets go of its loop and its sound when it leaves the page", async () => {
    const { element } = await mount();
    const close = vi.spyOn(element.sound, "close");
    element.remove();
    expect(close).toHaveBeenCalled();
  });
});
