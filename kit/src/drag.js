// Pointer Events with capture only, the HTML drag-and-drop API doesn't work on phones. On drop the
// legal places are asked for again, so a board redrawn meanwhile or a turn that ended plays nothing.

import DRAG_STYLE from "./drag.css";

export { DRAG_STYLE };

export const DRAG_THRESHOLD = 6;

export const RETURN_MS = 180;

// a phone may still send a click after a drag, it's eaten unless a new press came first
const CLICK_TAIL_MS = 400;

export function makeDraggable(root, { canDrag = () => true, targets = () => [], onDrop = () => {}, onCancel = () => {}, ghost: ghostOf } = {}) {
  let pressed = null;
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
    const base = copy.getBoundingClientRect();
    const lit = [...(targets(el) ?? [])].filter(Boolean);
    for (const one of lit) one.setAttribute("data-drop-ok", "");
    el.setAttribute("data-dragging", "");
    drag = { el, id, x, y, ghost: copy, ox: rect.left - base.left, oy: rect.top - base.top, lit };
    try {
      root.setPointerCapture(id);
    } catch {
      // pointer already gone, its pointerup or pointercancel ends the drag
    }
    move(event);
  }

  function move(event) {
    drag.ghost.style.transform = placeOf(drag, event.clientX - drag.x, event.clientY - drag.y);
  }

  function end(back) {
    const one = drag;
    drag = null;
    eatClicksUntil = Date.now() + CLICK_TAIL_MS;
    for (const lit of one.lit) lit.removeAttribute("data-drop-ok");
    one.el.removeAttribute("data-dragging");
    try {
      if (root.hasPointerCapture?.(one.id)) root.releasePointerCapture(one.id);
    } catch {
      // released already
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
      // only the board's own capture, a piece losing a touch's implicit capture bubbles up here too
      if (drag && event.pointerId === drag.id && event.target === root) cancel();
    },
  };
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
