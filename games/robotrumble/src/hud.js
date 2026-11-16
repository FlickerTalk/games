import { drawPortrait, drawRoundButton, drawSoundButtons, drawVolumeLine } from "../../../kit/src/canvas/index.js";
import { centreOf } from "../../../kit/src/canvas/layout.js";
import { TAU, circle, clamp, ellipse, line, paint, polygon, roundedRect, starPath, withRim } from "../../../kit/src/canvas/pen.js";
import { drawBoot, drawGlove } from "./parts.js";

const CELL = { step: 47, w: 40, h: 25 };
const LAMP = { step: 25, r: 8 };

export function drawBatteryBar(ctx, x, y, energy, theme, { direction = 1, scale = 1 } = {}) {
  const { ui, art } = theme;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(direction * scale, scale);
  for (let at = 0; at < 3; at += 1) {
    const left = at * CELL.step;
    const charge = clamp(energy - at);
    roundedRect(ctx, left, 0, CELL.w, CELL.h, 6);
    paint(ctx, ui.surface, ui.text, ui.line);
    roundedRect(ctx, left + CELL.w, 8, 5, 9, 2);
    paint(ctx, ui.text, null, 0);
    if (charge > 0) {
      ctx.fillStyle = energy <= 1 ? art.battery.low : art.battery.full;
      ctx.fillRect(left + 4, 4, (CELL.w - 8) * charge, CELL.h - 8);
    }
    line(ctx, [[left + 22, 6], [left + 17, 13], [left + 23, 13], [left + 18, 20]], ui.surface, 2);
  }
  ctx.restore();
}

export function drawRoundLamps(ctx, x, y, wins, theme, { direction = 1, scale = 1, shape = "circle" } = {}) {
  const { ui } = theme;
  const r = LAMP.r * scale;
  ctx.save();
  for (let at = 0; at < 3; at += 1) {
    const px = x + direction * (r + at * LAMP.step * scale);
    const lit = at < wins;
    const [fill, edge] = lit ? [ui.accent, ui.accent] : [ui.surface2, ui.muted];
    if (shape === "diamond") polygon(ctx, [[px, y - r - 1], [px + r + 1, y], [px, y + r + 1], [px - r - 1, y]], fill, edge, ui.line);
    else circle(ctx, px, y, r, fill, edge, ui.line);
    if (lit) circle(ctx, px - r * 0.25, y - r * 0.25, r * 0.22, ui.onAccent);
  }
  ctx.restore();
}

export function drawShieldBadge(ctx, x, y, size, theme) {
  const { ink, shield, white } = theme.art;
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.42);
  ctx.lineTo(size * 0.35, -size * 0.25);
  ctx.lineTo(size * 0.29, size * 0.18);
  ctx.quadraticCurveTo(0, size * 0.48, -size * 0.29, size * 0.18);
  ctx.lineTo(-size * 0.35, -size * 0.25);
  ctx.closePath();
  paint(ctx, shield.body, ink, 3);
  starPath(ctx, 0, 0, size * 0.21);
  paint(ctx, white, null, 0);
  ctx.restore();
}

export function drawControlButton(ctx, target, kind, theme, { lit = false, pressed = false, shield = false } = {}) {
  const { ui } = theme;
  const [x, y] = centreOf(target);
  const radius = Math.min(target.w, target.h) / 2 - ui.line;
  ctx.save();
  circle(ctx, x, y, radius, lit || pressed ? ui.pressed : ui.surface, lit ? ui.accent : ui.border, ui.line);
  if (lit) circle(ctx, x, y, radius - 5, null, ui.accent, ui.line * 1.5);
  withRim(ctx, { ink: theme.art.ink, colour: theme.art.rim }, () => {
    if (kind === "boot") drawBoot(ctx, x - 1, y - 1, radius * 0.82, theme);
    else drawGlove(ctx, x + 4, y, radius * 0.78, theme);
  });
  if (shield) drawShieldBadge(ctx, x, y - radius + 20, 36, theme);
  ctx.restore();
}

function windUpKey(ctx, x, y, size, colour) {
  const width = Math.max(2, size * 0.1);
  ctx.save();
  ctx.lineCap = "round";
  line(ctx, [[x, y + size * 0.5], [x, y - size * 0.05]], colour, width);
  ellipse(ctx, x - size * 0.24, y - size * 0.26, size * 0.2, size * 0.22, null, colour, width);
  ellipse(ctx, x + size * 0.24, y - size * 0.26, size * 0.2, size * 0.22, null, colour, width);
  ctx.restore();
}

// share: how much of the window to choose in is left, 0 once it has closed
export function drawDial(ctx, x, y, r, share, theme) {
  const { ui } = theme;
  const left = clamp(share);
  ctx.save();
  circle(ctx, x, y, r - 3, ui.surface, ui.track, 6);
  if (left > 0) {
    ctx.beginPath();
    ctx.arc(x, y, r - 3, -Math.PI / 2, -Math.PI / 2 + TAU * left * 0.999);
    ctx.lineCap = "round";
    paint(ctx, null, ui.accent, 6);
  }
  windUpKey(ctx, x, y - 1, Math.max(24, r * 1.1), left > 0 ? ui.text : ui.muted);
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
