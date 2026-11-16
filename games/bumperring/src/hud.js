import { drawPortrait, drawRoundButton, drawSoundButtons, drawVolumeLine } from "../../../kit/src/canvas/index.js";
import { centreOf } from "../../../kit/src/canvas/layout.js";
import { TAU, circle, clamp, line, paint, polygon, roundedRect } from "../../../kit/src/canvas/pen.js";
import { FIRST_TO } from "./arena.js";

function shell(ctx, x, y, size, won, theme) {
  const { ui, art } = theme;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(-size * 0.42, size * 0.2);
  ctx.quadraticCurveTo(-size * 0.5, -size * 0.35, 0, -size * 0.44);
  ctx.quadraticCurveTo(size * 0.5, -size * 0.35, size * 0.42, size * 0.2);
  ctx.quadraticCurveTo(0, size * 0.46, -size * 0.42, size * 0.2);
  ctx.closePath();
  paint(ctx, won ? art.shell.body : ui.surface2, won ? art.ink : ui.muted, 2);
  if (won) for (let at = -2; at <= 2; at += 1) line(ctx, [[0, size * 0.28], [at * size * 0.17, -size * 0.29 + Math.abs(at) * size * 0.05]], art.shell.shade, 2);
  ctx.restore();
}

export function drawShells(ctx, x, y, count, theme, { size = 26, turned = false } = {}) {
  const { ui } = theme;
  const gap = size * 1.05;
  ctx.save();
  ctx.translate(x, y);
  if (turned) ctx.rotate(Math.PI);
  roundedRect(ctx, -gap * 1.62, -size * 0.68, gap * 3.24, size * 1.36, size * 0.68);
  paint(ctx, ui.surface, ui.border, ui.line);
  for (let at = 0; at < FIRST_TO; at += 1) shell(ctx, (at - 1) * gap, 0, size, at < count, theme);
  ctx.restore();
}

export function drawDashButton(ctx, area, theme, { charge = 0, pressed = false, toward = [0, -1] } = {}) {
  const { ui } = theme;
  const [x, y] = centreOf(area);
  const r = Math.min(area.w, area.h) / 2 - 3;
  ctx.save();
  circle(ctx, x, y, r, pressed ? ui.pressed : ui.surface, pressed ? ui.accent : ui.border, ui.line);
  circle(ctx, x, y, r * (pressed ? 0.7 : 0.76), ui.accent);
  if (charge > 0) {
    ctx.beginPath();
    ctx.arc(x, y, r * 0.88, -Math.PI / 2, -Math.PI / 2 + clamp(charge) * TAU);
    ctx.lineCap = "round";
    paint(ctx, null, ui.text, 6);
  }
  ctx.translate(x, y);
  ctx.rotate(Math.atan2(toward[1], toward[0]));
  for (let at = -1; at <= 1; at += 1) polygon(ctx, [[at * r * 0.24 - 5, -r * 0.22], [at * r * 0.24 + r * 0.18, 0], [at * r * 0.24 - 5, r * 0.22]], ui.onAccent);
  ctx.restore();
}

function timeLine(ctx, area, left, ui) {
  roundedRect(ctx, area.x, area.y, area.w, area.h, area.h / 2);
  paint(ctx, ui.track, null, 0);
  const share = clamp(left);
  if (share <= 0) return;
  roundedRect(ctx, area.x, area.y, Math.max(area.h, area.w * share), area.h, area.h / 2);
  paint(ctx, ui.accent, null, 0);
}

export function drawPlayBar(ctx, layout, state, theme, time) {
  const { bar, controls, row } = layout;
  const { ui } = theme;
  const face = row - 12;
  const middle = bar.y + bar.h / 2;
  const start = bar.x + 8;
  const end = controls.pause.x - 6;
  ctx.save();
  roundedRect(ctx, bar.x, bar.y, bar.w, bar.h, ui.radius);
  paint(ctx, ui.surface, ui.border, ui.line);
  drawPortrait(ctx, start + face / 2, middle, face, { player: state.me, face: "happy" }, ui, { time });
  if (state.rival) drawPortrait(ctx, end - face / 2, middle, face, { player: state.rival, face: "happy" }, ui, { time });
  const track = { x: start + face + 10, y: middle - 5, w: end - start - 2 * face - 20, h: 10 };
  if (track.w >= 24) timeLine(ctx, track, state.left, ui);
  drawRoundButton(ctx, "pause", ...centreOf(controls.pause), Math.min(row - 12, 44), ui, { pressed: state.press?.kind === "pause" });
  drawSoundButtons(ctx, controls, state.sound, ui, { size: Math.min(row - 12, 44), press: state.press });
  if (state.sound.open) drawVolumeLine(ctx, layout.volume, state.sound.volume, ui, { pressed: state.press?.kind === "volume" });
  ctx.restore();
}
