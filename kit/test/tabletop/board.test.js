import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DRAG_STYLE } from "../../src/drag.js";
import { TABLETOP_STYLE, canvasBoard } from "../../src/tabletop/board.js";
import { recorder } from "../canvas/recorder.js";
import { setHostTheme } from "../canvas/themes.js";

function toyScene(context) {
  const scene = {
    context,
    pressed: [],
    held: [],
    dropped: [],
    draws: [],
    next: null,
    update: vi.fn((next) => {
      scene.context = next;
    }),
    label: () => `Toy board ${scene.context.round}`,
    sizes: [],
    buttons: ({ size }) =>
      scene.sizes.push(size) &&
      [0, 1, 2].map((key) => ({
        key,
        box: { x: key / 3, y: 0, w: 1 / 3, h: 1 / 3 },
        label: `Cell ${key}${scene.pressed.includes(key) ? " pressed" : ""}`,
        disabled: key === 2,
        data: { cell: key, drag: key === 0 },
      })),
    press: (key) => scene.pressed.push(key),
    canDrag: (key) => key === 0,
    dropTargets: () => [1],
    dragAt: (key, point) => scene.held.push([key, point]),
    drop: (key, target) => scene.dropped.push([key, target]),
    draw: (ctx, frame) => {
      scene.draws.push(frame);
      return scene.next;
    },
    destroy: vi.fn(),
  };
  return scene;
}

function rig({ ratio = 2 } = {}) {
  const frames = [];
  const pens = [];
  let scene = null;
  const themes = [];
  const board = canvasBoard(
    {
      theme: (tokens, mode) => {
        themes.push({ tokens, ...mode });
        return { name: themes.length };
      },
      scene: (context) => (scene = toyScene(context)),
    },
    {
      frame: (callback) => frames.push(callback),
      cancel: vi.fn(),
      context: () => {
        const pen = recorder();
        pens.push(pen);
        return pen;
      },
      ratio: () => ratio,
      still: () => false,
    },
  );
  const host = document.createElement("div");
  host.getBoundingClientRect = () => ({ left: 10, top: 20, width: 300, height: 300, right: 310, bottom: 320 });
  document.body.append(host);
  const mounted = board.mount(host, { round: 1 });
  const run = (now = 16) => frames.splice(0).forEach((callback) => callback(now));
  return { host, mounted, run, frames, pens, themes, scene: () => scene };
}

const pointer = (node, type, x, y) => node.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, isPrimary: true, button: 0, pointerType: "touch" }));

beforeEach(() => {
  document.body.innerHTML = "";
  setHostTheme(document.documentElement, null);
});
afterEach(() => {
  setHostTheme(document.documentElement, null);
  vi.useRealTimers();
});

describe("a board drawn on a canvas", () => {
  it("holds a canvas hidden from screen readers and, over it, the scene's labelled buttons in a named group", () => {
    const { host } = rig();
    const canvas = host.querySelector("canvas");
    expect(canvas.getAttribute("aria-hidden")).toBe("true");
    const group = host.querySelector('[role="group"]');
    expect(group.getAttribute("aria-label")).toBe("Toy board 1");
    expect([...group.querySelectorAll("button")].map((one) => one.getAttribute("aria-label"))).toEqual(["Cell 0", "Cell 1", "Cell 2"]);
    expect(TABLETOP_STYLE).toContain(DRAG_STYLE);
  });

  it("hands a tap on an open button to the scene and shows what changed, and ignores a closed one", () => {
    const { host, scene } = rig();
    host.querySelector('[data-key="1"]').click();
    host.querySelector('[data-key="2"]').click();
    expect(scene().pressed).toEqual([1]);
    expect(host.querySelector('[data-key="1"]').getAttribute("aria-label")).toBe("Cell 1 pressed");
  });

  it("passes every new context to the scene and lays the buttons out again", () => {
    const { host, mounted, scene } = rig();
    mounted.update({ round: 2 });
    expect(scene().update).toHaveBeenCalledWith({ round: 2 });
    expect(host.querySelector('[role="group"]').getAttribute("aria-label")).toBe("Toy board 2");
  });

  it("lays the buttons out at the board's size, again whenever the board changes size", () => {
    const { host, mounted, scene } = rig();
    expect(scene().sizes.at(-1)).toBe(300);
    host.getBoundingClientRect = () => ({ left: 10, top: 20, width: 200, height: 200, right: 210, bottom: 220 });
    mounted.update({ round: 2 });
    expect(scene().sizes.at(-1)).toBe(200);
    expect(host.querySelector("canvas").width).toBe(400);
  });

  it("draws the scene at the host's size, sharp on the screen's pixel ratio, while it asks for frames, then rests", () => {
    vi.useFakeTimers();
    const { host, run, frames, scene, pens } = rig({ ratio: 3 });
    const canvas = host.querySelector("canvas");
    expect([canvas.width, canvas.height]).toEqual([900, 900]);
    scene().next = 0;
    run(16);
    expect(scene().draws.at(-1)).toMatchObject({ size: 300, now: 16, still: false, theme: { name: 1 } });
    expect(pens.at(-1).calls.find((call) => call.op === "clearRect").points).toEqual([[0, 0], [900, 900]]);
    run(32);
    expect(scene().draws).toHaveLength(2);
    scene().next = 500;
    run(48);
    expect(frames).toHaveLength(0);
    vi.advanceTimersByTime(500);
    expect(frames).toHaveLength(1);
    scene().next = null;
    run(600);
    expect(frames).toHaveLength(0);
  });

  it("takes the app's colours from the frame's root and follows them when the app changes its theme", async () => {
    const { run, themes, scene } = rig();
    expect(themes.at(-1)).toMatchObject({ tokens: null, dark: false });
    setHostTheme(document.documentElement, "ember-dark");
    await Promise.resolve();
    expect(themes.at(-1).dark).toBe(true);
    expect(themes.at(-1).tokens.page).toBe("#0d0b0a");
    run();
    expect(scene().draws.at(-1).theme).toEqual({ name: themes.length });
  });

  it("follows a piece dragged by a finger in the canvas's own coordinates and drops it on a square the scene allows", () => {
    const { host, scene } = rig();
    const from = host.querySelector('[data-key="0"]');
    const to = host.querySelector('[data-key="1"]');
    const realFromPoint = document.elementFromPoint;
    document.elementFromPoint = () => to;
    pointer(from, "pointerdown", 30, 40);
    pointer(from, "pointermove", 60, 70);
    expect(scene().held.at(-1)).toEqual([0, { x: 50, y: 50 }]);
    expect(to.hasAttribute("data-drop-ok")).toBe(true);
    pointer(host.querySelector('[role="group"]'), "pointerup", 60, 70);
    document.elementFromPoint = realFromPoint;
    expect(scene().dropped).toEqual([[0, 1]]);
    expect(scene().held.at(-1)).toEqual([0, null]);
  });

  it("lets go of everything when the match leaves the screen", () => {
    const { host, mounted, run, frames, scene } = rig();
    scene().next = 0;
    run();
    mounted.destroy();
    run();
    expect(scene().destroy).toHaveBeenCalled();
    expect(scene().draws).toHaveLength(1);
    expect(frames).toHaveLength(0);
    expect(host.children).toHaveLength(0);
  });
});
