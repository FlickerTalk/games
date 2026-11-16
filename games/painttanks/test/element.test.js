// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeCore } from "../../../kit/test/helpers.js";
import { definePaintTanks } from "../src/element.js";
import { memoryStore } from "./harness.js";

definePaintTanks("ft-painttanks-test");

async function mount(opening = {}) {
  const core = fakeCore();
  const element = document.createElement("ft-painttanks-test");
  element.ft = { ...core.ft, store: memoryStore() };
  document.body.append(element);
  await core.open({ lang: "es", live: false, ...opening });
  await element.game.idle();
  return { core, element };
}

const labels = (element) => [...element.querySelectorAll(".ftc-a11y button")].map((button) => button.getAttribute("aria-label"));
const press = (element, label) => [...element.querySelectorAll(".ftc-a11y button")].find((button) => button.getAttribute("aria-label") === label).click();

beforeEach(() => {
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("data-fill");
});
afterEach(() => vi.restoreAllMocks());

describe("the Paint Tanks element", () => {
  it("draws on one canvas and names it in the player's language", async () => {
    const { element } = await mount();
    const canvas = element.querySelector("canvas");
    expect(canvas.getAttribute("role")).toBe("img");
    expect(canvas.getAttribute("aria-label")).toMatch(/^Paint Tanks: tira/);
  });

  it("lays a named button over everything the canvas lets the player touch", async () => {
    const { element } = await mount({ solo: true });
    expect(labels(element)).toEqual(expect.arrayContaining(["Jugar", "Colinas", "Mar profundo", "Sonido", "Vehículos y bolas de pintura"]));
    press(element, "Jugar");
    await element.game.idle();
    expect(element.game.state.screen).toBe("play");
    expect(labels(element)).toEqual(expect.arrayContaining(["Pausa", "Lanzar", "Apuntar más alto, ahora 45 grados", "Más fuerza, ahora 60"]));
  });

  it("never touches the live channel when played against FlickerTalk", async () => {
    const { core, element } = await mount({ solo: true });
    press(element, "Jugar");
    await element.game.idle();
    expect(core.ft.live.send).not.toHaveBeenCalled();
  });

  it("lets go of its loop and its sound when it leaves the page", async () => {
    const { element } = await mount();
    const close = vi.spyOn(element.sound, "close");
    element.remove();
    expect(close).toHaveBeenCalled();
  });
});
