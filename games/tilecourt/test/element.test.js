// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeCore } from "../../../kit/test/helpers.js";
import { ROOM_CHROME } from "../../../kit/src/stage.js";
import { defineTileCourt, roomHeight } from "../src/element.js";
import { memoryStore } from "./harness.js";

defineTileCourt("ft-tilecourt-test");

async function mount(opening = {}) {
  const core = fakeCore();
  const element = document.createElement("ft-tilecourt-test");
  element.ft = { ...core.ft, store: memoryStore() };
  document.body.append(element);
  await core.open({ lang: "es", live: false, ...opening });
  await element.game.idle();
  return { core, element };
}

const buttons = (element) => [...element.querySelectorAll(".ftc-a11y button")];

beforeEach(() => {
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("data-fill");
});
afterEach(() => vi.restoreAllMocks());

describe("the Tile Court element", () => {
  it("draws on one canvas and names it in the player's language", async () => {
    const { element } = await mount();
    const canvas = element.querySelector("canvas");
    expect(canvas).not.toBeNull();
    expect(canvas.getAttribute("role")).toBe("img");
    expect(canvas.getAttribute("aria-label")).toMatch(/^Patio de piezas: arrastra/);
  });

  it("lays a named button over everything the canvas lets the player touch, for the keyboard and screen readers", async () => {
    const { element } = await mount();
    const labels = buttons(element).map((button) => button.getAttribute("aria-label"));
    expect(labels).toContain("Jugar");
    expect(labels).toContain("Patio del día");
    expect(labels).toContain("Sonido");
    buttons(element).find((button) => button.getAttribute("aria-label") === "Jugar").click();
    await element.game.idle();
    expect(element.game.state.screen).toBe("play");
    expect(buttons(element).map((button) => button.getAttribute("aria-label"))).toContain("Pausa");
  });

  it("is as tall as the conversation's room leaves, and fills the frame in full screen", async () => {
    expect(roomHeight(853)).toBe(853 - ROOM_CHROME);
    expect(roomHeight(500)).toBe(300);
    expect(roomHeight(3000)).toBe(1100);
    const { element } = await mount();
    expect(element.style.height).toBe(`${roomHeight(globalThis.screen.height || 853)}px`);
    document.documentElement.setAttribute("data-fill", "1");
    element.measure();
    expect(element.style.height).toBe("");
  });

  it("asks for the player's name with a field of its own, and hands it to the pick screen", async () => {
    const { element } = await mount();
    element.game.state.pick = { step: "look", choice: { who: "ari", hair: "none", hairColour: "ink", name: "" }, scroll: { hair: 0, colour: 0 }, press: null };
    element.game.state.screen = "avatar";
    element.ask("rename");
    const field = element.querySelector("input");
    expect(field.hidden).toBe(false);
    field.value = "Bea";
    field.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(field.hidden).toBe(true);
    expect(element.game.state.pick.choice.name).toBe("Bea");
  });

  it("never touches the live channel when played against FlickerTalk", async () => {
    const { core, element } = await mount({ solo: true });
    buttons(element).find((button) => button.getAttribute("aria-label") === "Jugar").click();
    await element.game.idle();
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
