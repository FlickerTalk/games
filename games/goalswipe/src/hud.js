import { DIGITS, drawDigits, drawPortrait, drawRoundButton, drawSoundButtons, drawVolumeLine, formatNumber } from "../../../kit/src/canvas/index.js";
import { centreOf } from "../../../kit/src/canvas/layout.js";
import { circle, line, paint, polygon, roundedRect } from "../../../kit/src/canvas/pen.js";
import { TALLY } from "./layout.js";

const SHAPES = ["circle", "diamond"];

function mark(ctx, x, y, size, shape, fill, edge, width) {
  if (shape === "diamond") polygon(ctx, [[x, y - size / 2], [x + size / 2, y], [x, y + size / 2], [x - size / 2, y]], fill, edge, width);
  else circle(ctx, x, y, size / 2 - width / 2, fill, edge, width);
}

export function drawTally(ctx, area, marks, ui, { shape = "circle", shooting = false } = {}) {
  const { size, gap, pad } = TALLY;
  const y = area.y + area.h / 2;
  ctx.save();
  roundedRect(ctx, area.x, area.y, area.w, area.h, area.h / 2);
  paint(ctx, ui.surface, shooting ? ui.accent : ui.border, ui.line);
  marks.forEach((result, at) => {
    const x = area.x + pad + size / 2 + at * (size + gap);
    if (result === "goal") mark(ctx, x, y, size, shape, ui.accent, ui.accent, ui.line);
    else mark(ctx, x, y, size, shape, result ? ui.surface2 : null, ui.muted, ui.line);
    if (result === "miss") {
      line(ctx, [[x - size * 0.2, y - size * 0.2], [x + size * 0.2, y + size * 0.2]], ui.muted, ui.line);
      line(ctx, [[x + size * 0.2, y - size * 0.2], [x - size * 0.2, y + size * 0.2]], ui.muted, ui.line);
    }
  });
  ctx.restore();
}

function person(ctx, x, y, face, one, ui, { time, lang, side }) {
  ctx.save();
  if (one.away) ctx.globalAlpha = 0.45;
  drawPortrait(ctx, x, y, face, { player: one.player, thinking: one.thinking, face: one.face ?? "happy" }, ui, { time });
  ctx.restore();
  const at = side ? x - face / 2 - 8 : x + face / 2 + 8;
  drawDigits(ctx, formatNumber(one.goals, lang), at, y, DIGITS.score, ui.text, side ? "right" : "left");
}

export function drawPlayBar(ctx, layout, view, theme, time) {
  const { bar, controls, row, tallies } = layout;
  const { ui } = theme;
  const face = row - 12;
  const middle = bar.y + bar.h / 2;
  const button = Math.min(row - 12, 44);
  ctx.save();
  roundedRect(ctx, bar.x, bar.y, bar.w, bar.h, ui.radius);
  paint(ctx, ui.surface, ui.border, ui.line);
  person(ctx, bar.x + 8 + face / 2, middle, face, view.people[0], ui, { time, lang: view.lang, side: 0 });
  person(ctx, controls.pause.x - 6 - face / 2, middle, face, view.people[1], ui, { time, lang: view.lang, side: 1 });
  view.tallies.forEach((marks, side) => drawTally(ctx, tallies[side], marks, ui, { shape: SHAPES[side], shooting: view.shooting === side }));
  drawRoundButton(ctx, "pause", ...centreOf(controls.pause), button, ui, { pressed: view.press?.kind === "pause" });
  drawSoundButtons(ctx, controls, view.sound, ui, { size: button, press: view.press });
  if (view.sound.open) drawVolumeLine(ctx, layout.volume, view.sound.volume, ui, { pressed: view.press?.kind === "volume" });
  ctx.restore();
}
