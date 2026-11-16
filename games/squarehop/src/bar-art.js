import { DIGITS, FONT, centreOf, drawDigits, drawPortrait, drawRoundButton, drawSoundButtons, drawVolumeLine, formatNumber } from "../../../kit/src/canvas/index.js";
import { circle, line, paint, roundedRect } from "../../../kit/src/canvas/pen.js";
import { FINISH } from "./rules.js";

const FACE = 40;
const SNUG_FACE = 32;
const DIGITS_ROOM = 190;

function turnRing(ctx, x, y, size, ui) {
  circle(ctx, x, y, size * 0.48 + 3, null, ui.accent, 3);
}

function raceLine(ctx, { x, y, w }, squares, theme) {
  const { ui, art } = theme;
  const at = (square) => x + (w * (square - 1)) / (FINISH - 1);
  line(ctx, [[x, y], [x + w, y]], ui.track, 5);
  roundedRect(ctx, at(squares[1]) - 6, y - 6, 12, 12, 3);
  paint(ctx, art.sides[1].plate, ui.text, 1.5);
  circle(ctx, at(squares[0]), y, 6.5, art.sides[0].plate, ui.text, 1.5);
}

function shortSeats(ctx, layout, squares) {
  const { bar, controls, row, rival } = layout;
  const snug = controls.pause.x - bar.x < DIGITS_ROOM;
  const face = snug ? SNUG_FACE : FACE;
  const mineX = bar.x + (snug ? 6 : 10) + face / 2;
  const theirs = snug ? { x: controls.pause.x - 4 - face / 2, y: bar.y + row / 2, size: face } : rival;
  const size = snug ? DIGITS.best : DIGITS.score;
  const gap = snug ? 6 : 8;
  const width = (words, px) => {
    ctx.font = `800 ${px}px ${FONT}`;
    return ctx.measureText(words).width;
  };
  const room = theirs.x - theirs.size / 2 - 6 - (mineX + face / 2 + gap);
  return { face, mineX, theirs, size, gap, digits: room >= (width(squares[0], size) + width(squares[1], DIGITS.best)) * 1.15 + 6 };
}

export function drawBar(ctx, layout, shown, theme, time = 0) {
  const { ui } = theme;
  const { bar, controls, row, rival } = layout;
  const { sound, press = null, lang, me, other, turn } = shown;
  const pressed = (kind) => press?.kind === kind;
  const button = Math.min(row - 12, 44);
  const middle = bar.y + row / 2;
  const tall = bar.h > row;
  const squares = [me.square, other.square].map((square) => formatNumber(square, lang));
  const { face, mineX, theirs, size, gap, digits } = tall ? { face: FACE, mineX: bar.x + 10 + FACE / 2, theirs: rival, size: DIGITS.score, gap: 8, digits: true } : shortSeats(ctx, layout, squares);
  ctx.save();
  roundedRect(ctx, bar.x, bar.y, bar.w, bar.h, ui.radius);
  paint(ctx, ui.surface, ui.border, ui.line);
  if (turn === 0) turnRing(ctx, mineX, middle, face, ui);
  drawPortrait(ctx, mineX, middle, face, { player: me.player, face: me.face }, ui, { time, lang });
  if (digits) drawDigits(ctx, squares[0], mineX + face / 2 + gap, middle, size, ui.text);
  if (turn === 1) turnRing(ctx, theirs.x, theirs.y, theirs.size, ui);
  drawPortrait(ctx, theirs.x, theirs.y, theirs.size, { player: other.player, face: other.face, thinking: other.thinking, score: digits ? other.square : null }, ui, { time, lang });
  if (tall) raceLine(ctx, { x: bar.x + 20, y: rival.y, w: rival.x - rival.size / 2 - 64 - bar.x - 20 }, [me.square, other.square], theme);
  drawRoundButton(ctx, "pause", ...centreOf(controls.pause), button, ui, { pressed: pressed("pause") });
  drawSoundButtons(ctx, controls, sound, ui, { size: button, press });
  if (sound.open) drawVolumeLine(ctx, layout.volume, sound.volume, ui, { pressed: pressed("volume") });
  ctx.restore();
}
