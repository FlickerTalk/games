// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { avatarText } from "../../src/avatars/index.js";
import { defineCanvasGame, roomHeight } from "../../src/canvas/element.js";
import { themeFromTokens } from "../../src/canvas/theme.js";
import { ROOM_CHROME } from "../../src/stage.js";
import { fakeCore } from "../helpers.js";
import { setHostTheme } from "./themes.js";

function fakeGame(env) {
  const state = { lang: "en", width: 0, height: 0, fill: false };
  const game = {
    state,
    env,
    presses: [],
    pointers: [],
    renamed: null,
    closed: false,
    playing: false,
    paused: false,
    rest: false,
    frames: 0,
    open: async (opening) => {
      state.lang = opening.lang;
    },
    resize: (width, height, fill) => Object.assign(state, { width, height, fill }),
    frame: () => {
      game.frames += 1;
    },
    targets: () => (game.paused ? [{ kind: "resume", value: "resume", x: 10, y: 20, w: 120, h: 120 }] : [
      { kind: "play", value: "play", x: 10, y: 20, w: 120, h: 120 },
      { kind: "slot", value: 0, x: 0, y: 300, w: 100, h: 100 },
      ...(game.playing ? [{ kind: "pause", value: "pause", x: 300, y: 8, w: 48, h: 48 }] : []),
    ]),
    pointer: (event) => {
      game.pointers.push(event);
      if (game.asksOnUp && event.type === "up") env.onAsk("rename");
    },
    press: (target) => {
      game.presses.push(target.kind);
      if (target.kind === "pause") game.paused = true;
    },
    rename: (text) => {
      game.renamed = text;
    },
    resting: () => game.rest,
    close: () => {
      game.closed = true;
    },
  };
  return game;
}

defineCanvasGame("ft-canvas-test", {
  version: "2.0.0",
  create: fakeGame,
  draw: () => {},
  theme: (tokens, mode) => ({ ui: themeFromTokens(tokens, mode) }),
  label: (target) => `${target.kind}!`,
  button: (target) => target.kind !== "slot",
  canvasLabel: (lang) => `canvas ${lang}`,
  music: "calm",
});

let frames = [];

async function mount(opening = {}) {
  const core = fakeCore();
  const element = document.createElement("ft-canvas-test");
  element.ft = core.ft;
  document.body.append(element);
  await core.open({ lang: "es", live: false, ...opening });
  await Promise.resolve();
  return { core, element, game: element.game };
}

function send(element, name, Kind = PointerEvent) {
  const event = new Kind(name, { bubbles: true, cancelable: true, clientX: 5, clientY: 5, pointerId: 1 });
  const canvas = element.querySelector("canvas");
  canvas.dispatchEvent(event);
  const field = element.querySelector("input");
  if (name === "mousedown" && !event.defaultPrevented && document.activeElement === field) field.blur();
  return event;
}

function tapName(element, order) {
  element.game.asksOnUp = true;
  for (const [name, Kind] of order) send(element, name, Kind);
  element.game.asksOnUp = false;
  return element.querySelector("input");
}

const TOUCH = [["pointerdown"], ["pointerup"], ["touchend", Event], ["mousedown", MouseEvent], ["mouseup", MouseEvent], ["click", MouseEvent]];
const MOUSE = [["pointerdown"], ["mousedown", MouseEvent], ["pointerup"], ["mouseup", MouseEvent], ["click", MouseEvent]];

function setHidden(hidden) {
  Object.defineProperty(document, "hidden", { value: hidden, configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
}

const buttons = (element) => [...element.querySelectorAll("button")];
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  frames = [];
  vi.stubGlobal("requestAnimationFrame", (run) => frames.push(run));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("data-fill");
  setHostTheme(document.documentElement, null);
});
afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(document, "hidden", { value: false, configurable: true });
});

describe("a canvas game's element", () => {
  it("draws on one canvas named in the player's language, and makes the game with the sound and its controls", async () => {
    const { element, game } = await mount();
    const canvas = element.querySelector("canvas");
    expect(canvas.getAttribute("role")).toBe("img");
    expect(canvas.getAttribute("aria-label")).toBe("canvas es");
    expect(game.env.sound).toBe(element.sound);
    expect(typeof game.env.controls.toggle).toBe("function");
    expect(game.env.app).toBe("2.0.0");
  });

  it("lays a named button over every target the game does not drag, and presses the target on a click", async () => {
    const { element, game } = await mount();
    expect(buttons(element).map((button) => button.getAttribute("aria-label"))).toEqual(["play!"]);
    buttons(element)[0].click();
    expect(game.presses).toEqual(["play"]);
  });

  it("hands the game every touch in the canvas's own coordinates", async () => {
    const { element, game } = await mount();
    const canvas = element.querySelector("canvas");
    canvas.getBoundingClientRect = () => ({ left: 10, top: 20, width: 384, height: 556 });
    canvas.dispatchEvent(new PointerEvent("pointerdown", { clientX: 110, clientY: 220, pointerId: 3 }));
    canvas.dispatchEvent(new PointerEvent("pointerup", { clientX: 112, clientY: 221, pointerId: 3 }));
    expect(game.pointers).toEqual([{ type: "down", x: 100, y: 200, id: 3 }, { type: "up", x: 102, y: 201, id: 3 }]);
  });

  it("is as tall as the conversation's room leaves, and fills the frame in full screen", async () => {
    expect(roomHeight(853)).toBe(853 - ROOM_CHROME);
    expect(roomHeight(500)).toBe(300);
    expect(roomHeight(3000)).toBe(1100);
    const { element } = await mount();
    expect(element.style.height).toBe(`${roomHeight(globalThis.screen.height || 853)}px`);
    document.documentElement.setAttribute("data-fill", "1");
    await settle();
    expect(element.style.height).toBe("");
    expect(element.game.state.fill).toBe(true);
  });

  it("asks for the player's name in a field of its own, in the app's colours, and hands it over", async () => {
    setHostTheme(document.documentElement, "mono-dark");
    const { element, game } = await mount();
    game.env.onAsk("rename");
    const field = element.querySelector("input");
    expect(field.hidden).toBe(false);
    expect(field.getAttribute("aria-label")).toBe(avatarText("es", "name"));
    expect(field.style.color).not.toBe("");
    field.value = "Bea";
    field.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(field.hidden).toBe(true);
    expect(game.renamed).toBe("Bea");
  });

  it("keeps the name field open and focused after a touch, whose mouse events come after the finger lifts", async () => {
    const { element, game } = await mount();
    const field = tapName(element, TOUCH);
    expect(field.hidden).toBe(false);
    expect(document.activeElement).toBe(field);
    expect(game.renamed).toBe(null);
  });

  it("keeps the name field open and focused after a click with a mouse", async () => {
    const { element, game } = await mount();
    const field = tapName(element, MOUSE);
    expect(field.hidden).toBe(false);
    expect(document.activeElement).toBe(field);
    expect(game.renamed).toBe(null);
  });

  it("closes the name field and keeps the name when the player touches the canvas afterwards, or leaves the field", async () => {
    for (const order of [TOUCH, MOUSE]) {
      const { element, game } = await mount();
      const field = tapName(element, order);
      field.value = "Bea";
      send(element, "pointerdown");
      expect(field.hidden).toBe(true);
      expect(game.renamed).toBe("Bea");
      expect(game.pointers.at(-1).type).toBe("down");
      element.remove();
    }
    const { element, game } = await mount();
    const field = tapName(element, TOUCH);
    field.value = "Leo";
    field.blur();
    expect(field.hidden).toBe(true);
    expect(game.renamed).toBe("Leo");
  });

  it("takes the app's colours, follows them when the app changes its theme, and falls back on its own", async () => {
    setHostTheme(document.documentElement, "mono-dark");
    const { element } = await mount();
    expect(element.theme.ui.page).toBe("#000000");
    setHostTheme(document.documentElement, "ember-light");
    await settle();
    expect(element.theme.ui.page).toBe("#FBF8F5");
    setHostTheme(document.documentElement, null);
    document.documentElement.setAttribute("data-dark", "");
    await settle();
    expect(element.theme.ui).toEqual(themeFromTokens(null, { dark: true }));
  });

  it("stops drawing while the page is hidden or the game rests, and starts again on a touch", async () => {
    const { element, game } = await mount();
    const run = () => frames.splice(0).forEach((frame) => frame(1000));
    run();
    expect(game.frames).toBeGreaterThan(0);
    expect(frames).toHaveLength(1);
    game.rest = true;
    run();
    expect(frames).toHaveLength(0);
    element.querySelector("canvas").dispatchEvent(new PointerEvent("pointerdown", { clientX: 1, clientY: 1 }));
    expect(frames).toHaveLength(1);
    game.rest = false;
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    run();
    expect(frames).toHaveLength(0);
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(frames).toHaveLength(1);
  });

  it("pauses a round when the page is hidden, runs one frame so the other phone hears it, and stays paused when the page is shown again", async () => {
    const { element, game } = await mount();
    frames.splice(0).forEach((frame) => frame(1000));
    game.playing = true;
    const before = game.frames;
    setHidden(true);
    expect(game.presses).toEqual(["pause"]);
    expect(game.frames).toBe(before + 1);
    expect(buttons(element).map((button) => button.getAttribute("aria-label"))).toEqual(["resume!"]);
    setHidden(false);
    frames.splice(0).forEach((frame) => frame(2000));
    setHidden(true);
    setHidden(false);
    expect(game.presses).toEqual(["pause"]);
    expect(game.paused).toBe(true);
  });

  it("leaves a game that is not in a round as it is when the page is hidden", async () => {
    const { game } = await mount();
    const before = game.frames;
    setHidden(true);
    setHidden(false);
    expect(game.presses).toEqual([]);
    expect(game.frames).toBe(before);
  });

  it("starts the game's music once open, and lets go of its loop, its sound and the game when it leaves the page", async () => {
    const { element, game } = await mount();
    const music = vi.spyOn(element.sound, "music");
    await element.opened({ lang: "en" });
    expect(music).toHaveBeenCalledWith("calm");
    const close = vi.spyOn(element.sound, "close");
    element.remove();
    expect(close).toHaveBeenCalled();
    expect(game.closed).toBe(true);
  });
});
