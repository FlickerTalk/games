// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeCore } from "../../../kit/test/helpers.js";
import { ROOM_CHROME } from "../../../kit/src/stage.js";
import { defineBeepRoute, roomHeight } from "../src/element.js";
import { memoryStore } from "./harness.js";

defineBeepRoute("ft-beeproute-test");

async function mount(opening = {}) {
  const core = fakeCore();
  const element = document.createElement("ft-beeproute-test");
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

describe("the Beep Route element", () => {
  it("draws on one canvas and names it in the player's language", async () => {
    const { element } = await mount();
    const canvas = element.querySelector("canvas");
    expect(canvas.getAttribute("role")).toBe("img");
    expect(canvas.getAttribute("aria-label")).toMatch(/^Beep Route: pon flechas/);
  });

  it("lays a named button over everything the canvas lets the player touch, the strip's slots excepted", async () => {
    const { element } = await mount();
    expect(labels(element)).toEqual(expect.arrayContaining(["Jugar", "Niveles", "Crear un nivel", "Sonido"]));
    await press(element, "Jugar");
    expect(element.game.state.screen).toBe("play");
    expect(labels(element)).toEqual(expect.arrayContaining(["Adelante", "Girar a la izquierda", "Girar a la derecha", "Quitar la última orden", "Poner en marcha el programa", "Pausa"]));
    await press(element, "Adelante");
    expect(element.game.state.round.edit.items).toEqual(["F"]);
  });

  it("lets a level be made from the keyboard, square by square", async () => {
    const { element } = await mount();
    await press(element, "Crear un nivel");
    await press(element, "Jugar");
    expect(element.game.state.screen).toBe("build");
    await press(element, "Casilla 15");
    expect(element.game.state.build.level.cells[14]).toBe("#");
    expect(labels(element)).toContain("Casilla 15: Muro");
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
