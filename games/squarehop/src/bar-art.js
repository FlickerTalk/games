import { DIGITS, centreOf, drawDigits, drawPortrait, drawRoundButton, drawSoundButtons, drawVolumeLine, formatNumber } from "../../../kit/src/canvas/index.js";
import { circle, line, paint, roundedRect } from "../../../kit/src/canvas/pen.js";
import { FINISH } from "./rules.js";

const FACE = 40;
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

export function drawBar(ctx, layout, shown, theme, time = 0) {
  const { ui } = theme;
  const { bar, controls, row, rival } = layout;
  const { sound, press = null, lang, me, other, turn } = shown;
  const pressed = (kind) => press?.kind === kind;
  const button = Math.min(row - 12, 44);
  const middle = bar.y + row / 2;
  const tall = bar.h > row;
  const digits = tall || controls.pause.x - bar.x >= DIGITS_ROOM;
  ctx.save();
  roundedRect(ctx, bar.x, bar.y, bar.w, bar.h, ui.radius);
  paint(ctx, ui.surface, ui.border, ui.line);
  const mineX = bar.x + 10 + FACE / 2;
  if (turn === 0) turnRing(ctx, mineX, middle, FACE, ui);
  drawPortrait(ctx, mineX, middle, FACE, { player: me.player, face: me.face }, ui, { time, lang });
  if (digits) drawDigits(ctx, formatNumber(me.square, lang), mineX + FACE / 2 + 8, middle, DIGITS.score, ui.text);
  if (turn === 1) turnRing(ctx, rival.x, rival.y, rival.size, ui);
  drawPortrait(ctx, rival.x, rival.y, rival.size, { player: other.player, face: other.face, thinking: other.thinking, score: digits ? other.square : null }, ui, { time, lang });
  if (tall) raceLine(ctx, { x: bar.x + 20, y: rival.y, w: rival.x - rival.size / 2 - 64 - bar.x - 20 }, [me.square, other.square], theme);
  drawRoundButton(ctx, "pause", ...centreOf(controls.pause), button, ui, { pressed: pressed("pause") });
  drawSoundButtons(ctx, controls, sound, ui, { size: button, press });
  if (sound.open) drawVolumeLine(ctx, layout.volume, sound.volume, ui, { pressed: pressed("volume") });
  ctx.restore();
}
