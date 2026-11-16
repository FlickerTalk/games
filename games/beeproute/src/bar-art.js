import { centreOf, drawPortrait, drawRoundButton, drawSoundButtons, drawVolumeLine } from "../../../kit/src/canvas/index.js";
import { circle, line, paint, roundedRect, starPath } from "../../../kit/src/canvas/pen.js";
import { drawBattery } from "./tiles-art.js";

const ICON = 26;
const STEP = 21;
const DOTS = 5;

export const levelDots = (level) => ({ current: (Math.max(1, Math.floor(level) || 1) - 1) % DOTS, count: DOTS });

function batteries(ctx, x, y, { total, got }, theme) {
  for (let at = 0; at < total; at += 1) {
    ctx.save();
    if (!(got & (1 << at))) ctx.globalAlpha = 0.35;
    drawBattery(ctx, x + at * STEP, y, ICON, theme, 0);
    ctx.restore();
  }
  return total ? total * STEP + 10 : 0;
}

function dots(ctx, { x, y, w }, level, ui) {
  const { current, count } = levelDots(level);
  const gap = w / (count - 1);
  line(ctx, [[x, y], [x + w, y]], ui.track, 5);
  if (current > 0) line(ctx, [[x, y], [x + gap * current, y]], ui.accent, 5);
  for (let at = 0; at < count; at += 1) {
    const here = at === current;
    circle(ctx, x + gap * at, y, here ? 10 : 7, at <= current ? ui.accent : ui.surface2, at <= current ? ui.accent : ui.border, ui.line);
    if (here) {
      starPath(ctx, x + gap * at, y, 6);
      paint(ctx, ui.onAccent, null, 0);
    }
  }
}

function levelPath(ctx, layout, level, left, ui) {
  if (!level) return;
  const { bar, row, controls, rival } = layout;
  if (bar.h > row) {
    const area = layout.progress;
    dots(ctx, { x: area.x + 12, y: area.y + area.h / 2, w: Math.min(150, area.w - 24) }, level, ui);
    return;
  }
  const right = rival ? rival.x - rival.size / 2 - 12 : (controls.pause ?? controls.speaker).x - 12;
  if (right - left >= 100) dots(ctx, { x: left + 10, y: bar.y + row / 2, w: Math.min(150, right - left - 20) }, level, ui);
}

export function drawBar(ctx, layout, shown, theme, time = 0) {
  const { ui } = theme;
  const { bar, controls, row } = layout;
  const { sound, press = null } = shown;
  const pressed = (kind) => press?.kind === kind;
  const button = Math.min(row - 12, 44);
  ctx.save();
  roundedRect(ctx, bar.x, bar.y, bar.w, bar.h, ui.radius);
  paint(ctx, ui.surface, ui.border, ui.line);
  const used = batteries(ctx, bar.x + 14 + ICON / 3, bar.y + row / 2, shown.batteries, theme);
  levelPath(ctx, layout, shown.level, bar.x + 8 + used, ui);
  if (layout.rival && shown.rival) drawPortrait(ctx, layout.rival.x, layout.rival.y, layout.rival.size, shown.rival, ui, { time, lang: shown.lang });
  if (controls.pause) drawRoundButton(ctx, "pause", ...centreOf(controls.pause), button, ui, { pressed: pressed("pause") });
  drawSoundButtons(ctx, controls, sound, ui, { size: button, press });
  if (sound.open) drawVolumeLine(ctx, layout.volume, sound.volume, ui, { pressed: pressed("volume") });
  ctx.restore();
}
