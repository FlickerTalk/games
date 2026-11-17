import { paint, roundedRect } from "../canvas/pen.js";

const GONE = ["left", "silent", "unreachable"];
const SOUND = ["speaker", "music", "volume"];
const NOTE_WIDE = 360;
const NOTE_TALL = 52;
const SIDE = 16;
const FONT = { most: 15, least: 12 };
const notes = new WeakMap();

// with no notice it was this player who left, not the friend
export const friendLeft = (status) => status?.phase === "left" && GONE.includes(status.notice);

export function drawFriendLeft(ctx, rival, status, ui) {
  if (!rival || !friendLeft(status)) return;
  ctx.save();
  roundedRect(ctx, rival.x + 3, rival.y + 3, rival.w - 6, rival.h - 6, ui.radius);
  paint(ctx, null, ui.page, ui.line + 1);
  ctx.setLineDash([6, 5]);
  paint(ctx, null, ui.muted, ui.line * 2);
  ctx.restore();
}

export function friendNoteBox(targets, width, height) {
  const shown = targets.filter((one) => !SOUND.includes(one.kind));
  const lowest = Math.max(0, ...shown.map((one) => one.y + one.h));
  const w = Math.min(width - 2 * SIDE, NOTE_WIDE);
  const below = { x: (width - w) / 2, y: lowest + 8, w, h: Math.max(0, height - lowest - 12) };
  const play = shown.find((one) => one.kind === "play");
  if (below.h >= NOTE_TALL || !play) return below;
  const right = Math.min(...shown.filter((one) => one.y + one.h > play.y).map((one) => one.x)) - 12;
  return { x: SIDE, y: play.y, w: Math.min(right - SIDE, NOTE_WIDE), h: Math.max(0, height - play.y - 4) };
}

function fit(line) {
  for (let size = FONT.most; size > FONT.least && line.scrollHeight > line.clientHeight + 1; size -= 1) line.style.fontSize = `${size - 1}px`;
}

function lineFor(host) {
  let line = notes.get(host);
  if (line) return line;
  line = host.ownerDocument.createElement("p");
  line.setAttribute("role", "status");
  line.dir = "auto";
  host.append(line);
  notes.set(host, line);
  return line;
}

export function showFriendNote(canvas, note) {
  const host = canvas?.parentElement;
  if (!host) return;
  if (!note) {
    const line = notes.get(host);
    if (line && !line.hidden) line.hidden = true;
    return;
  }
  const line = lineFor(host);
  const { text, lang, box, ui } = note;
  const drawn = JSON.stringify([text, lang, box, ui.text, ui.surface, ui.border, ui.line, ui.radius]);
  line.hidden = false;
  if (line.dataset.drawn === drawn) return;
  line.dataset.drawn = drawn;
  line.textContent = text;
  line.lang = lang;
  Object.assign(line.style, {
    position: "absolute", left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, maxHeight: `${box.h}px`,
    boxSizing: "border-box", margin: "0", padding: "6px 12px", overflow: "hidden", pointerEvents: "none",
    font: "inherit", fontSize: `${FONT.most}px`, lineHeight: "1.3", textAlign: "center",
    color: ui.text, background: ui.surface, border: `${ui.line}px solid ${ui.border}`, borderRadius: `${ui.radius}px`,
  });
  fit(line);
}
