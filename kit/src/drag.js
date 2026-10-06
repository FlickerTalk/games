// Dragging a piece with the finger (Ioan's decision, 2026-10-06: the games are played on phones, so
// every piece, card or ship that moves can also be dragged; a tap on the piece and then on its
// place stays, for accessibility and for small targets). A board marks what can be dragged with
// `data-drag` and says, for a piece, which elements are its legal places; the kit does the rest.
//
// - A press becomes a drag only after a small movement, so a tap still reaches the board as a click.
// - A copy of the piece (`.ftg-ghost`) follows the finger with a transform, inside the board's own
//   box so it keeps the board's styles; nothing in the page is laid out again, and the copy never
//   takes a touch (`pointer-events: none`).
// - The legal places carry `data-drop-ok` while the drag lasts; the source, `data-dragging`.
// - Letting go: the element under the finger (`document.elementFromPoint`), or the nearest of its
//   ancestors that is a legal place, is handed to the board. The places are asked for again then,
//   so a board redrawn meanwhile, or a turn that ended, plays nothing. Anywhere else the copy
//   slides back and the board hears `onCancel`.
// - One finger at a time; the system taking the touch (a scroll, a call) cancels it.
// Pointer Events with pointer capture only: the HTML drag-and-drop API does not work on phones.

import DRAG_STYLE from "./drag.css";

/** What a board that drags adds to its stylesheet (`STYLE`), so the other games carry none of it. */
export { DRAG_STYLE };

/** How far, in CSS pixels, a press moves before it is a drag and not a tap. */
export const DRAG_THRESHOLD = 6;

/** How long the copy takes to slide back, in milliseconds. */
export const RETURN_MS = 180;

/** How long after a drag a click with no press of its own is taken for its tail (a phone may
 *  still send one) and eaten; a new press always lets the next click through. */
const CLICK_TAIL_MS = 400;

/**
 * Makes the `[data-drag]` elements inside `root` draggable.
 * - `canDrag(el)`: whether this piece may be picked up now;
 * - `targets(el)`: the elements it may be dropped on now;
 * - `onDrop(el, target)`: it was dropped on one of them;
 * - `onCancel(el)`: it was let go anywhere else, or the drag was cancelled;
 * - `ghost(el)`: what to copy under the finger (the piece itself by default).
 * Returns `{ active, cancel(), destroy() }`: a board cancels a drag when the turn ends.
 */
export function makeDraggable(root, { canDrag = () => true, targets = () => [], onDrop = () => {}, onCancel = () => {}, ghost: ghostOf } = {}) {
  /** A press not yet a drag: `{ el, id, x, y }`. */
  let pressed = null;
  /** The drag going on: `{ el, id, x, y, ghost, ox, oy, lit }`. */
  let drag = null;
  let eatClicksUntil = 0;

  const placeOf = (one, dx, dy) => `translate3d(${one.ox + dx}px, ${one.oy + dy}px, 0)`;

  function lift(event) {
    const { el, id, x, y } = pressed;
    pressed = null;
    const source = ghostOf?.(el) ?? el;
    const rect = source.getBoundingClientRect();
    const copy = source.cloneNode(true);
    for (const name of [...copy.getAttributeNames()]) if (name.startsWith("data-") || name === "id") copy.removeAttribute(name);
    copy.setAttribute("aria-hidden", "true");
    copy.setAttribute("inert", "");
    copy.classList.add("ftg-ghost");
    Object.assign(copy.style, {
      position: "absolute",
      left: "0",
      top: "0",
      margin: "0",
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      pointerEvents: "none",
      transform: "none",
    });
    const layer = root.firstElementChild ?? root;
    layer.append(copy);
    // Where the copy lands at (0, 0) of its box, whatever box that is: it is moved from there onto the piece.
    const base = copy.getBoundingClientRect();
    const lit = [...(targets(el) ?? [])].filter(Boolean);
    for (const one of lit) one.setAttribute("data-drop-ok", "");
    el.setAttribute("data-dragging", "");
    drag = { el, id, x, y, ghost: copy, ox: rect.left - base.left, oy: rect.top - base.top, lit };
    try {
      root.setPointerCapture(id);
    } catch {
      // A pointer that is gone already: the drag ends with its pointerup or pointercancel.
    }
    move(event);
  }

  function move(event) {
    drag.ghost.style.transform = placeOf(drag, event.clientX - drag.x, event.clientY - drag.y);
  }

  /** The drag is over: the lights go out; the copy goes, sliding back first unless it was dropped. */
  function end(back) {
    const one = drag;
    drag = null;
    eatClicksUntil = Date.now() + CLICK_TAIL_MS;
    for (const lit of one.lit) lit.removeAttribute("data-drop-ok");
    one.el.removeAttribute("data-dragging");
    try {
      if (root.hasPointerCapture?.(one.id)) root.releasePointerCapture(one.id);
    } catch {
      // Released already.
    }
    if (!back) {
      one.ghost.remove();
      return one;
    }
    one.ghost.style.transition = `transform ${RETURN_MS}ms ease-out`;
    one.ghost.style.transform = placeOf(one, 0, 0);
    setTimeout(() => one.ghost.remove(), RETURN_MS);
    return one;
  }

  function cancel() {
    pressed = null;
    if (!drag) return;
    const one = end(true);
    onCancel(one.el);
  }

  function drop(event) {
    const el = drag.el;
    const legal = new Set([...(targets(el) ?? [])].filter(Boolean));
    let node = document.elementFromPoint(event.clientX, event.clientY);
    while (node && node !== root && !legal.has(node)) node = node.parentElement;
    if (node && legal.has(node) && node.isConnected) {
      end(false);
      onDrop(el, node);
    } else {
      end(true);
      onCancel(el);
    }
  }

  const listeners = {
    pointerdown(event) {
      eatClicksUntil = 0;
      if (pressed || drag || event.isPrimary === false) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      const el = event.target.closest?.("[data-drag]");
      if (!el || !root.contains(el) || !canDrag(el)) return;
      pressed = { el, id: event.pointerId, x: event.clientX, y: event.clientY };
    },
    pointermove(event) {
      if (drag && event.pointerId === drag.id) {
        event.preventDefault();
        move(event);
      } else if (pressed && event.pointerId === pressed.id && Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) >= DRAG_THRESHOLD) {
        event.preventDefault();
        lift(event);
      }
    },
    pointerup(event) {
      if (pressed && event.pointerId === pressed.id) pressed = null;
      else if (drag && event.pointerId === drag.id) drop(event);
    },
    pointercancel(event) {
      if ((pressed && event.pointerId === pressed.id) || (drag && event.pointerId === drag.id)) cancel();
    },
    lostpointercapture(event) {
      // The board's own capture only: the piece losing the implicit capture of a touch to the board bubbles up here too.
      if (drag && event.pointerId === drag.id && event.target === root) cancel();
    },
  };
  /** The click a phone may still send after a drag is not a tap. */
  const eatClick = (event) => {
    if (Date.now() >= eatClicksUntil) return;
    eatClicksUntil = 0;
    event.stopImmediatePropagation();
    event.preventDefault();
  };

  for (const [type, listener] of Object.entries(listeners)) root.addEventListener(type, listener);
  root.addEventListener("click", eatClick, true);

  return {
    get active() {
      return drag !== null;
    },
    cancel,
    destroy() {
      cancel();
      for (const [type, listener] of Object.entries(listeners)) root.removeEventListener(type, listener);
      root.removeEventListener("click", eatClick, true);
    },
  };
}
