import { drawAvatar } from "../avatars/index.js";
import { drawRoundButton } from "./buttons.js";
import { box, centreOf } from "./layout.js";
import { circle, clamp, line, paint, roundedRect, starPath } from "./pen.js";

export const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
export const DIGITS = Object.freeze({ score: 28, best: 20, big: 38 });

const PAD = 8;

export const formatNumber = (value, lang) => new Intl.NumberFormat(lang || "en").format(value);

export function drawDigits(ctx, words, x, y, size, colour, align = "left") {
  ctx.font = `800 ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.direction = "ltr";
  ctx.fillStyle = colour;
  ctx.fillText(words, x, y);
  return ctx.measureText(words).width;
}

export function barLayout(width, height, { rival = false, pause = true } = {}) {
  const tiny = height < 420;
  const tall = height >= 600;
  const row = tiny ? 48 : 56;
  const bar = box(PAD, PAD, width - 2 * PAD, tall ? row + 32 : row);
  const right = bar.x + bar.w;
  const music = box(right - row, bar.y, row, row);
  const speaker = box(music.x - row, bar.y, row, row);
  const first = pause ? box(speaker.x - row, bar.y, row, row) : speaker;
  const badge = tall ? 32 : 40;
  const rivalAt = !rival ? null : tall ? { x: right - 14 - badge / 2, y: bar.y + row + 15, size: badge } : { x: first.x - 4 - badge / 2, y: bar.y + row / 2, size: badge };
  const lineEnd = rivalAt && tall ? rivalAt.x - badge / 2 - 64 : right - 14;
  const progress = tall ? box(bar.x + 14, bar.y + row + 10, lineEnd - bar.x - 14, 12) : box(bar.x + 14, bar.y + bar.h - 9, first.x - bar.x - 28 - (rivalAt ? badge + 48 : 0), 5);
  const volume = box(Math.max(PAD, Math.min(width - PAD - 240, speaker.x + speaker.w / 2 - 120)), bar.y + bar.h + 6, 240, 64);
  return { bar, row, gap: tiny ? 8 : 12, controls: { pause: pause ? first : null, speaker, music }, rival: rivalAt, progress, best: tall || !rival, volume };
}

export const starMarks = ({ two, three }) => [two / three / 2, two / three, 1];

export function drawStar(ctx, x, y, size, lit, ui) {
  starPath(ctx, x, y, size / 2);
  paint(ctx, lit ? ui.accent : ui.surface2, lit ? ui.accent : ui.muted, ui.line);
}

export function drawStarProgress(ctx, area, score, thresholds, ui) {
  if (!thresholds || area.w < 120) return;
  const filled = clamp(score / thresholds.three);
  roundedRect(ctx, area.x, area.y, area.w, area.h, area.h / 2);
  paint(ctx, ui.track, null, 0);
  if (filled > 0) {
    roundedRect(ctx, area.x, area.y, Math.max(area.h, area.w * filled), area.h, area.h / 2);
    paint(ctx, ui.accent, null, 0);
  }
  const size = area.h >= 10 ? 24 : 15;
  for (const mark of starMarks(thresholds)) drawStar(ctx, area.x + area.w * mark - (mark === 1 ? size / 2 : 0), area.y + area.h / 2, size, filled >= mark, ui);
}

function thinkingDots(ctx, x, y, size, ui, time) {
  const width = size * 0.44;
  const height = Math.max(6, size * 0.18);
  roundedRect(ctx, x - width / 2, y - height / 2, width, height, height / 2);
  paint(ctx, ui.surface, ui.border, 1);
  for (let dot = 0; dot < 3; dot += 1) {
    const rise = Math.max(0, Math.sin(time * 6 - dot * 0.9)) * size * 0.03;
    circle(ctx, x + (dot - 1) * size * 0.11, y - rise, Math.max(1, size * 0.035), ui.text);
  }
}

export function drawPortrait(ctx, x, y, size, { player, score = null, thinking = false, face }, ui, { time = 0, lang = "en", score: place = "left" } = {}) {
  ctx.save();
  circle(ctx, x, y, size * 0.48, ui.surface2, ui.border, ui.line);
  drawAvatar(ctx, x, y + size * 0.04, size * 0.72, { ...player, face: thinking ? "thinking" : face, time });
  if (thinking) thinkingDots(ctx, x, y + size * 0.41, size, ui, time);
  if (Number.isFinite(score)) {
    if (place === "below") drawDigits(ctx, formatNumber(score, lang), x, y + size / 2 + DIGITS.best * 0.8, DIGITS.best, ui.text, "center");
    else drawDigits(ctx, formatNumber(score, lang), x - size / 2 - 6, y, DIGITS.best, ui.text, "right");
  }
  ctx.restore();
}

export function drawVolumeLine(ctx, area, value, ui, { pressed = false } = {}) {
  const start = area.x + 24;
  const end = area.x + area.w - 24;
  const y = area.y + area.h / 2;
  const at = start + (end - start) * clamp(value);
  ctx.save();
  roundedRect(ctx, area.x, area.y, area.w, area.h, ui.radius);
  paint(ctx, pressed ? ui.pressed : ui.surface, ui.border, ui.line);
  line(ctx, [[start, y], [end, y]], ui.track, 8);
  if (at > start) line(ctx, [[start, y], [at, y]], ui.accent, 8);
  circle(ctx, at, y, 14, ui.accent, ui.page, ui.line);
  ctx.restore();
}

export function drawSoundButtons(ctx, { speaker, music }, sound, ui, { size, press = null } = {}) {
  const diameter = (area) => size ?? Math.min(44, Math.min(area.w, area.h) - 12);
  drawRoundButton(ctx, "speaker", ...centreOf(speaker), diameter(speaker), ui, { level: sound.level, pressed: press?.kind === "speaker" });
  drawRoundButton(ctx, "music", ...centreOf(music), diameter(music), ui, { off: !sound.music, pressed: press?.kind === "music" });
}

function scores(ctx, layout, { score, best, lang }, ui) {
  const { bar, row } = layout;
  const middle = bar.y + row / 2;
  const width = drawDigits(ctx, formatNumber(score, lang), bar.x + 14, middle, DIGITS.score, ui.text);
  if (!layout.best || best === null || best === undefined) return;
  const starX = bar.x + 14 + width + 22;
  drawStar(ctx, starX, middle, 22, true, ui);
  drawDigits(ctx, formatNumber(best, lang), starX + 15, middle, DIGITS.best, ui.text);
}

export function drawTopBar(ctx, layout, state, ui, time = 0) {
  const { bar, controls, row } = layout;
  const { score, thresholds, sound, rival, lang, press = null } = state;
  const button = Math.min(row - 12, 44);
  ctx.save();
  roundedRect(ctx, bar.x, bar.y, bar.w, bar.h, ui.radius);
  paint(ctx, ui.surface, ui.border, ui.line);
  scores(ctx, layout, state, ui);
  drawStarProgress(ctx, layout.progress, score, thresholds, ui);
  if (layout.rival && rival) drawPortrait(ctx, layout.rival.x, layout.rival.y, layout.rival.size, rival, ui, { time, lang });
  if (controls.pause) drawRoundButton(ctx, "pause", ...centreOf(controls.pause), button, ui, { pressed: press?.kind === "pause" });
  drawSoundButtons(ctx, controls, sound, ui, { size: button, press });
  if (sound.open) drawVolumeLine(ctx, layout.volume, sound.volume, ui, { pressed: press?.kind === "volume" });
  ctx.restore();
}
