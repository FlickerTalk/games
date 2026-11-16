import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeCore } from "../../../kit/test/helpers.js";
import { defineDuoSquad } from "../src/element.js";
import { TEXTS } from "../src/texts.js";
import { memoryStore } from "./harness.js";

defineDuoSquad("ft-duosquad-test");

async function mount(opening = {}) {
  const core = fakeCore();
  const element = document.createElement("ft-duosquad-test");
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

describe("the Duo Squad element", () => {
  it("draws on one canvas named in the player's language, with the gesture in its name", async () => {
    const { element } = await mount({ solo: true });
    const canvas = element.querySelector("canvas");
    expect(canvas.getAttribute("role")).toBe("img");
    expect(canvas.getAttribute("aria-label")).toBe(TEXTS.es.canvas);
  });

  it("lays a named button over everything the canvas lets the player touch, the three worlds among them", async () => {
    const { element } = await mount({ solo: true });
    expect(labels(element)).toEqual(expect.arrayContaining([TEXTS.es.play, TEXTS.es.looks, TEXTS.es.space, TEXTS.es.sea, TEXTS.es.land, "FlickerTalk", "Sonido", "Música"]));
    button(element, TEXTS.es.sea).click();
    await element.game.idle();
    expect(element.game.state.world).toBe("sea");
    button(element, TEXTS.es.play).click();
    await element.game.idle();
    expect(element.game.state.screen).toBe("play");
    expect(labels(element)).toContain(TEXTS.es.pause);
  });

  it("never touches the live channel with Flick as the teammate", async () => {
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
