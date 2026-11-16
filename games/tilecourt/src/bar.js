import { drawBadge } from "../../../kit/src/avatars/index.js";
import { drawButton } from "./buttons.js";
import { circle, clamp, line, paint, roundedRect, starPath } from "../../../kit/src/canvas/pen.js";

export const starMarks = ({ two, three }) => [two / three / 2, two / three, 1];

const number = (value, lang) => new Intl.NumberFormat(lang || "en").format(value);

function text(ctx, words, x, y, size, theme, align = "left") {
  ctx.font = `800 ${size}px ${theme.font}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.direction = "ltr";
  ctx.fillStyle = theme.ui.ink;
  ctx.fillText(words, x, y);
  return ctx.measureText(words).width;
}

export function drawStar(ctx, x, y, size, lit, theme) {
  starPath(ctx, x, y, size / 2);
  paint(ctx, lit ? theme.ui.star : theme.ui.starEmpty, theme.ui.ink, Math.max(theme.stroke.thin, size * 0.07));
}

function scores(ctx, layout, { score, best, lang }, theme) {
  const { bar, row } = layout;
  const middle = bar.y + row / 2;
  const width = text(ctx, number(score, lang), bar.x + 14, middle, theme.ui.text.score, theme);
  if (!layout.best || best === null || best === undefined) return;
  const starX = bar.x + 14 + width + 22;
  drawStar(ctx, starX, middle, 22, true, theme);
  text(ctx, number(best, lang), starX + 15, middle, theme.ui.text.best, theme);
}

function progress(ctx, { progress: area }, { score, thresholds }, theme) {
  if (!thresholds || area.w < 120) return;
  const { ui } = theme;
  const filled = clamp(score / thresholds.three);
  const y = area.y + area.h / 2;
  roundedRect(ctx, area.x, area.y, area.w, area.h, area.h / 2);
  paint(ctx, ui.track, null, 0);
  if (filled > 0) {
    roundedRect(ctx, area.x, area.y, Math.max(area.h, area.w * filled), area.h, area.h / 2);
    paint(ctx, ui.accent, null, 0);
  }
  const size = area.h >= 10 ? 24 : 15;
  for (const mark of starMarks(thresholds)) drawStar(ctx, area.x + area.w * mark - (mark === 1 ? size / 2 : 0), y, size, filled >= mark, theme);
}

function rivalBadge(ctx, layout, rival, theme, time, lang) {
  const at = layout.rival;
  if (!at || !rival) return;
  drawBadge(ctx, at.x, at.y, at.size, { ...rival.player, thinking: rival.thinking, face: rival.face, time });
  if (Number.isFinite(rival.score)) text(ctx, number(rival.score, lang), at.x - at.size / 2 - 6, at.y, theme.ui.text.best, theme, "right");
}

export function drawVolume(ctx, area, value, theme) {
  const { ui, stroke } = theme;
  const start = area.x + 24;
  const end = area.x + area.w - 24;
  const y = area.y + area.h / 2;
  const at = start + (end - start) * clamp(value);
  ctx.save();
  roundedRect(ctx, area.x, area.y, area.w, area.h, ui.radius.line);
  paint(ctx, ui.surface, ui.ink, stroke.base);
  line(ctx, [[start, y], [end, y]], ui.track, 10);
  if (at > start) line(ctx, [[start, y], [at, y]], ui.accent, 10);
  circle(ctx, at, y, 20, ui.soft, ui.ink, stroke.base);
  ctx.restore();
}

export function drawBar(ctx, layout, state, theme, time) {
  const { bar, controls, row } = layout;
  const { ui, stroke } = theme;
  const button = Math.min(row - 12, 44);
  ctx.save();
  roundedRect(ctx, bar.x, bar.y, bar.w, bar.h, ui.radius.panel);
  paint(ctx, ui.surface, ui.ink, stroke.base);
  scores(ctx, layout, state, theme);
  progress(ctx, layout, state, theme);
  rivalBadge(ctx, layout, state.rival, theme, time, state.lang);
  const centre = (area) => [area.x + area.w / 2, area.y + area.h / 2];
  drawButton(ctx, "pause", ...centre(controls.pause), button, theme);
  drawButton(ctx, "speaker", ...centre(controls.speaker), button, theme, { level: state.sound.level });
  drawButton(ctx, "music", ...centre(controls.music), button, theme, { off: !state.sound.music });
  if (state.sound.open) drawVolume(ctx, layout.volume, state.sound.volume, theme);
  ctx.restore();
}
