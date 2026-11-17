import { drawBadge } from "./badge.js";
import { FLICK, PROFILES } from "./cast.js";
import { defaultPlayer, loadPlayer } from "./player.js";

export const PORTRAIT_SIZE = 44;

const WAIT_MS = 1000;
const FRAME_MS = 66;
const GAP = 8;
const SMALLEST = 32;

const calm = (face) => ({ face, thinking: false });

export function portraitFaces(seen) {
  if (seen?.phase === "play") return seen.myTurn ? { me: calm("focused"), them: calm("neutral") } : { me: calm("neutral"), them: { face: "thinking", thinking: true } };
  if (seen?.phase === "over") {
    const winner = seen.result?.winner;
    if (winner === null || winner === undefined) return { me: calm("happy"), them: calm("happy") };
    return winner === seen.me ? { me: calm("cheering"), them: calm("oops") } : { me: calm("oops"), them: calm("cheering") };
  }
  return { me: calm("neutral"), them: calm("neutral") };
}

export function portraitSize(room, score) {
  if (!(room > 0)) return PORTRAIT_SIZE;
  const size = Math.floor((room - score - 2 * GAP) / 2);
  return size >= SMALLEST ? Math.min(PORTRAIT_SIZE, size) : 0;
}

export function standIn(choice) {
  const at = Math.max(0, PROFILES.findIndex((one) => one.id === choice?.who));
  return { who: PROFILES[(at + PROFILES.length / 2) % PROFILES.length].id, hair: "none", hairColour: "ink" };
}

function canvasFor(side) {
  const canvas = document.createElement("canvas");
  canvas.style.flex = "none";
  canvas.setAttribute("aria-hidden", "true");
  canvas.dataset.side = side;
  canvas.dataset.who = "";
  return canvas;
}

function resize(canvas, size) {
  const ratio = globalThis.devicePixelRatio || 1;
  canvas.hidden = size === 0;
  if (!size) return;
  canvas.width = Math.round(size * ratio);
  canvas.height = Math.round(size * ratio);
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
}

// ion-title clips what does not fit in its inner box, which the buttons on both sides make narrower
function measureBar(title, score) {
  const inner = title.shadowRoot?.querySelector(".toolbar-title") ?? title;
  return { room: inner.clientWidth, score: score.getBoundingClientRect().width };
}

function wait(promise, ms) {
  return Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(null), ms))]);
}

function stillMotion() {
  return Boolean(globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
}

// the kit's own page: the score sits in the bar's title, the game element holds its table and ft
function place(host) {
  const root = host.closest?.(".ftg");
  const score = root?.querySelector('.ftg-bar [data-part="score"]');
  if (!score) return null;
  const element = root.parentElement;
  return { score, title: score.closest("ion-title") ?? score.parentElement, solo: element?.table?.solo === true, ft: element?.ft ?? globalThis.ft };
}

function portraits(host, first, options) {
  const found = place(host);
  if (!found) return { update() {}, destroy() {} };
  const {
    frame = (callback) => globalThis.requestAnimationFrame?.(callback) ?? null,
    cancel = (id) => globalThis.cancelAnimationFrame?.(id),
    context = (canvas) => canvas.getContext?.("2d") ?? null,
    measure = measureBar,
  } = options;
  const row = document.createElement("div");
  row.style.cssText = `display:flex;align-items:center;justify-content:center;gap:${GAP}px`;
  const sides = { me: canvasFor("me"), them: canvasFor("them") };
  found.score.replaceWith(row);
  row.append(sides.me, found.score, sides.them);
  const pens = { me: context(sides.me), them: context(sides.them) };
  const people = { me: null, them: found.solo ? { who: FLICK.id } : null };
  let faces = portraitFaces(first?.view);
  let time = 0;
  let last = -Infinity;
  let pending = null;
  let gone = false;
  let size = null;

  const paint = () => {
    for (const side of ["me", "them"]) {
      const canvas = sides[side];
      canvas.dataset.face = faces[side].face;
      canvas.dataset.who = people[side]?.who ?? "";
      const pen = pens[side];
      if (!pen || !people[side] || !size) continue;
      const ratio = canvas.width / size;
      pen.setTransform(ratio, 0, 0, ratio, 0, 0);
      pen.clearRect(0, 0, size, size);
      drawBadge(pen, size / 2, size / 2, size, { ...people[side], ...faces[side], time });
    }
  };

  const fit = () => {
    const { room, score } = measure(found.title, found.score);
    const next = portraitSize(room, score);
    if (next === size) return;
    size = next;
    resize(sides.me, size);
    resize(sides.them, size);
    paint();
  };
  const watch = globalThis.ResizeObserver ? new ResizeObserver(() => fit()) : null;
  watch?.observe(found.title);
  watch?.observe(found.score);

  const tick = (ms) => {
    pending = null;
    if (gone) return;
    if (ms - last >= FRAME_MS && !globalThis.document?.hidden) {
      last = ms;
      time = ms / 1000;
      paint();
    }
    pending = frame(tick);
  };

  wait(loadPlayer(found.ft?.store, found.ft?.player ?? null), WAIT_MS).then((choice) => {
    if (gone) return;
    people.me = choice ?? defaultPlayer();
    people.them ??= standIn(people.me);
    paint();
  });
  fit();
  if (!stillMotion()) pending = frame(tick);

  return {
    update(next) {
      faces = portraitFaces(next?.view);
      fit();
      paint();
    },
    destroy() {
      gone = true;
      watch?.disconnect();
      if (pending !== null) cancel(pending);
      row.replaceWith(found.score);
    },
  };
}

export function withPortraits(board, options = {}) {
  return {
    ...board,
    mount(host, context) {
      const shown = board.mount(host, context);
      const faces = portraits(host, context, options);
      return {
        update(next) {
          shown?.update?.(next);
          faces.update(next);
        },
        destroy() {
          faces.destroy();
          shown?.destroy?.();
        },
      };
    },
  };
}
