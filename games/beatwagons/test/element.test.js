// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeCore } from "../../../kit/test/helpers.js";
import { ROOM_CHROME } from "../../../kit/src/stage.js";
import { defineBeatWagons, roomHeight } from "../src/element.js";
import { wagonName } from "../src/labels.js";
import { memoryStore } from "./harness.js";

defineBeatWagons("ft-beatwagons-test");

async function mount(opening = {}) {
  const core = fakeCore();
  const element = document.createElement("ft-beatwagons-test");
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

describe("the Beat Wagons element", () => {
  it("draws on one canvas and names it in the player's language", async () => {
    const { element } = await mount();
    const canvas = element.querySelector("canvas");
    expect(canvas.getAttribute("role")).toBe("img");
    expect(canvas.getAttribute("aria-label")).toMatch(/^Vagones con ritmo: los vagones/);
  });

  it("lays a named button over everything the canvas lets the player touch, the wagons of the siding by their names", async () => {
    const { element } = await mount();
    expect(labels(element)).toEqual(expect.arrayContaining(["Jugar", "Completar los trenes", "Componer un tren", "Sonido"]));
    await press(element, "Jugar");
    expect(element.game.state.screen).toBe("play");
    const round = element.game.state.round;
    expect(labels(element)).toEqual(expect.arrayContaining([...round.candidates.map((wagon) => wagonName("es", wagon)), "Pausa"]));
    round.phase = "solve";
    await press(element, wagonName("es", round.candidates[0]));
    expect(round.flying).toMatchObject({ index: 0 });
  });

  it("lets a train be composed from the keyboard, wagon by wagon, and says which wagons are hidden", async () => {
    const { element } = await mount({ solo: true });
    await press(element, "Componer un tren");
    await press(element, "Jugar");
    expect(element.game.state.screen).toBe("build");
    await press(element, "Vagón del tambor");
    await press(element, "Golpes del próximo vagón: 1");
    expect(labels(element)).toContain("Golpes del próximo vagón: 2");
    await press(element, "Vagón de la campana, 2 golpes");
    expect(element.game.state.build.wagons).toHaveLength(2);
    await press(element, "Vagón 2: esconderlo");
    expect(labels(element)).toContain("Hueco 2: devolver el vagón");
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
