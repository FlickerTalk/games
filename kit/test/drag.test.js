// Dragging a piece with the finger (Ioan's decision, 2026-10-06: the games are played on phones, so
// every piece, card or ship that moves can also be dragged). A press on a piece marked `data-drag`
// becomes a drag only after a small movement, so a tap still reaches the board as a click; a copy
// of the piece follows the finger while the legal places are lit; letting go over one hands it to
// the board, anywhere else the copy goes back and nothing is played. Pointer Events only: the HTML
// drag-and-drop API does not work on phones.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DRAG_STYLE, DRAG_THRESHOLD, RETURN_MS, makeDraggable } from "../src/drag.js";
import STYLE from "../src/style.css";

let realFromPoint;
beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = "";
  realFromPoint = document.elementFromPoint;
});
afterEach(() => {
  document.elementFromPoint = realFromPoint;
  vi.useRealTimers();
});

/** A board: three squares, a piece on the first; the second is a legal place, the third is not. */
function setup(options = {}) {
  const root = document.createElement("div");
  root.innerHTML = '<div class="game"><button data-cell="0" data-drag><i class="piece"></i></button><button data-cell="1"><span class="mark"></span></button><button data-cell="2"></button></div>';
  document.body.append(root);
  const cell = (n) => root.querySelector(`[data-cell="${n}"]`);
  const clicks = [];
  root.addEventListener("click", (event) => clicks.push(event.target.closest("[data-cell]")?.dataset.cell));
  const hooks = {
    canDrag: vi.fn(() => true),
    targets: vi.fn(() => [cell(1)]),
    onDrop: vi.fn(),
    onCancel: vi.fn(),
    ...options,
  };
  const drag = makeDraggable(root, hooks);
  return { root, cell, clicks, hooks, drag };
}

const pointer = (node, type, x, y, more = {}) =>
  node.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, isPrimary: true, button: 0, pointerType: "touch", ...more }));

/** A finger pressing on `from`, moving by (dx, dy), and lifting over `over` (or over nothing). */
function dragTo(root, from, over, dx = 40, dy = 0) {
  pointer(from, "pointerdown", 10, 10);
  pointer(from, "pointermove", 10 + dx / 2, 10 + dy / 2);
  pointer(from, "pointermove", 10 + dx, 10 + dy);
  document.elementFromPoint = vi.fn(() => over);
  pointer(root, "pointerup", 10 + dx, 10 + dy);
}

describe("a tap", () => {
  it("stays a tap: no copy, nothing lit, nothing dropped, and the click reaches the board", () => {
    const { root, cell, clicks, hooks } = setup();
    pointer(cell(0), "pointerdown", 10, 10);
    pointer(cell(0), "pointermove", 10 + DRAG_THRESHOLD - 2, 10);
    pointer(cell(0), "pointerup", 10 + DRAG_THRESHOLD - 2, 10);
    cell(0).click();
    expect(root.querySelector(".ftg-ghost")).toBeNull();
    expect(root.querySelector("[data-drop-ok]")).toBeNull();
    expect(hooks.targets).not.toHaveBeenCalled();
    expect(hooks.onDrop).not.toHaveBeenCalled();
    expect(clicks).toEqual(["0"]);
  });
});

describe("a drag", () => {
  it("lifts a copy that follows the finger without moving the page, and lights the legal places", () => {
    const { root, cell, hooks } = setup();
    pointer(cell(0), "pointerdown", 10, 10);
    pointer(cell(0), "pointermove", 30, 25);
    const ghost = root.querySelector(".ftg-ghost");
    expect(ghost).not.toBeNull();
    expect(hooks.canDrag).toHaveBeenCalledWith(cell(0));
    expect(hooks.targets).toHaveBeenCalledWith(cell(0));
    expect(ghost.style.pointerEvents).toBe("none");
    expect(ghost.style.position).toBe("absolute");
    expect(ghost.style.transform).toContain("translate3d(20px, 15px, 0");
    expect(ghost.getAttribute("aria-hidden")).toBe("true");
    expect(ghost.hasAttribute("data-drag")).toBe(false);
    expect(ghost.hasAttribute("data-cell")).toBe(false);
    expect(cell(1).hasAttribute("data-drop-ok")).toBe(true);
    expect(cell(2).hasAttribute("data-drop-ok")).toBe(false);
    expect(cell(0).hasAttribute("data-dragging")).toBe(true);
    pointer(root, "pointermove", 50, 10);
    expect(ghost.style.transform).toContain("translate3d(40px, 0px, 0");
  });

  it("copies what the board names as the piece, inside the board's own box", () => {
    const { root, cell } = setup({ ghost: (el) => el.querySelector(".piece") });
    pointer(cell(0), "pointerdown", 10, 10);
    pointer(cell(0), "pointermove", 40, 10);
    const ghost = root.querySelector(".ftg-ghost");
    expect(ghost.tagName).toBe("I");
    expect(ghost.classList.contains("piece")).toBe(true);
    expect(ghost.parentNode).toBe(root.querySelector(".game"));
  });

  it("drops on the legal place under the finger, found from whatever part of it is there, and eats the click that follows", () => {
    const { root, cell, clicks, hooks } = setup();
    dragTo(root, cell(0), cell(1).querySelector(".mark"));
    expect(hooks.onDrop).toHaveBeenCalledWith(cell(0), cell(1));
    expect(hooks.onCancel).not.toHaveBeenCalled();
    expect(root.querySelector(".ftg-ghost")).toBeNull();
    expect(root.querySelector("[data-drop-ok], [data-dragging]")).toBeNull();
    cell(0).click();
    expect(clicks).toEqual([]);
    vi.advanceTimersByTime(1000);
    cell(0).click();
    expect(clicks).toEqual(["0"]);
  });

  it("lets a new tap through at once after a drop: only a click with no press of its own is the drag's tail", () => {
    const { root, cell, clicks } = setup();
    dragTo(root, cell(0), cell(1));
    pointer(cell(2), "pointerdown", 80, 10);
    pointer(cell(2), "pointerup", 80, 10);
    cell(2).click();
    expect(clicks).toEqual(["2"]);
  });

  it("goes back when let go on a place that is not legal, or on nothing, and plays nothing", () => {
    const { root, cell, hooks } = setup();
    dragTo(root, cell(0), cell(2));
    expect(hooks.onDrop).not.toHaveBeenCalled();
    expect(hooks.onCancel).toHaveBeenCalledTimes(1);
    const ghost = root.querySelector(".ftg-ghost");
    expect(ghost).not.toBeNull();
    expect(ghost.style.transform).toContain("translate3d(0px, 0px, 0");
    expect(ghost.style.transition).toContain("transform");
    expect(root.querySelector("[data-drop-ok], [data-dragging]")).toBeNull();
    vi.advanceTimersByTime(RETURN_MS + 1);
    expect(root.querySelector(".ftg-ghost")).toBeNull();
    vi.advanceTimersByTime(1000);
    dragTo(root, cell(0), null);
    expect(hooks.onDrop).not.toHaveBeenCalled();
    expect(hooks.onCancel).toHaveBeenCalledTimes(2);
  });

  it("asks the board again at the drop, so a place no longer legal (the board redrawn, the turn over) is refused", () => {
    const { root, cell, hooks } = setup();
    pointer(cell(0), "pointerdown", 10, 10);
    pointer(cell(0), "pointermove", 40, 10);
    hooks.targets.mockReturnValue([]);
    document.elementFromPoint = vi.fn(() => cell(1));
    pointer(root, "pointerup", 40, 10);
    expect(hooks.onDrop).not.toHaveBeenCalled();
    expect(hooks.onCancel).toHaveBeenCalled();
  });

  it("starts nothing on a piece the board refuses, or on what is not a piece", () => {
    const { root, cell, hooks } = setup({ canDrag: vi.fn(() => false) });
    pointer(cell(0), "pointerdown", 10, 10);
    pointer(cell(0), "pointermove", 60, 10);
    pointer(cell(2), "pointerdown", 10, 10);
    pointer(cell(2), "pointermove", 60, 10);
    expect(root.querySelector(".ftg-ghost")).toBeNull();
    expect(hooks.targets).not.toHaveBeenCalled();
  });

  it("is cancelled by the system taking the touch, and by the board when the turn ends", () => {
    const { root, cell, hooks, drag } = setup();
    pointer(cell(0), "pointerdown", 10, 10);
    pointer(cell(0), "pointermove", 40, 10);
    pointer(root, "pointercancel", 40, 10);
    expect(hooks.onCancel).toHaveBeenCalledTimes(1);
    expect(root.querySelector("[data-drop-ok]")).toBeNull();
    vi.advanceTimersByTime(1000);
    pointer(cell(0), "pointerdown", 10, 10);
    pointer(cell(0), "pointermove", 40, 10);
    expect(drag.active).toBe(true);
    drag.cancel();
    expect(drag.active).toBe(false);
    expect(hooks.onCancel).toHaveBeenCalledTimes(2);
    document.elementFromPoint = vi.fn(() => cell(1));
    pointer(root, "pointerup", 40, 10);
    expect(hooks.onDrop).not.toHaveBeenCalled();
  });

  it("keeps going when the piece's own implicit capture moves to the board (a phone's lostpointercapture on the piece, bubbling)", () => {
    const { root, cell, hooks, drag } = setup();
    pointer(cell(0), "pointerdown", 10, 10);
    pointer(cell(0), "pointermove", 40, 10);
    cell(0).dispatchEvent(new PointerEvent("lostpointercapture", { bubbles: true, pointerId: 1, isPrimary: true, pointerType: "touch" }));
    expect(drag.active).toBe(true);
    expect(cell(1).hasAttribute("data-drop-ok")).toBe(true);
    root.dispatchEvent(new PointerEvent("lostpointercapture", { bubbles: true, pointerId: 1, isPrimary: true, pointerType: "touch" }));
    expect(drag.active).toBe(false);
    expect(hooks.onCancel).toHaveBeenCalledTimes(1);
  });

  it("follows one finger only: a second one is ignored", () => {
    const { root, cell, hooks } = setup();
    pointer(cell(0), "pointerdown", 10, 10);
    pointer(cell(0), "pointermove", 40, 10);
    pointer(cell(0), "pointerdown", 10, 10, { pointerId: 2, isPrimary: false });
    pointer(root, "pointermove", 90, 90, { pointerId: 2, isPrimary: false });
    expect(root.querySelector(".ftg-ghost").style.transform).toContain("translate3d(30px, 0px, 0");
    pointer(root, "pointerup", 90, 90, { pointerId: 2, isPrimary: false });
    expect(hooks.onDrop).not.toHaveBeenCalled();
    expect(hooks.onCancel).not.toHaveBeenCalled();
    expect(root.querySelectorAll(".ftg-ghost")).toHaveLength(1);
    document.elementFromPoint = vi.fn(() => cell(1));
    pointer(root, "pointerup", 40, 10);
    expect(hooks.onDrop).toHaveBeenCalledTimes(1);
  });

  it("lets go of the board when it leaves the screen", () => {
    const { root, cell, hooks, drag } = setup();
    drag.destroy();
    pointer(cell(0), "pointerdown", 10, 10);
    pointer(cell(0), "pointermove", 40, 10);
    expect(root.querySelector(".ftg-ghost")).toBeNull();
    expect(hooks.targets).not.toHaveBeenCalled();
  });
});

describe("the look", () => {
  it("keeps a piece from scrolling the sheet under the finger, and styles the copy and the lit places, for the boards that drag only", () => {
    expect(STYLE).not.toContain("data-drag");
    const css = DRAG_STYLE.replace(/\s/g, "");
    expect(css).toMatch(/\[data-drag\]\{[^}]*touch-action:none/);
    expect(css).toContain("[data-drop-ok]");
    expect(css).toContain(".ftg-ghost");
  });
});
