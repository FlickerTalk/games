import { centreOf, drawPortrait, drawRoundButton, drawSoundButtons, drawVolumeLine } from "../../../kit/src/canvas/index.js";
import { circle, line, paint, roundedRect } from "../../../kit/src/canvas/pen.js";

const STEP = 30;

export const trainDots = ({ total, at, done }) => Array.from({ length: total }, (_, train) => ({ done: train < at || (train === at && done), here: train === at }));

function dots(ctx, x, y, trains, ui) {
  const marks = trainDots(trains);
  line(ctx, [[x, y], [x + STEP * (marks.length - 1), y]], ui.track, 5);
  marks.forEach((mark, at) => circle(ctx, x + at * STEP, y, mark.here ? 10 : 7, mark.done ? ui.accent : ui.surface2, mark.done || mark.here ? ui.accent : ui.border, ui.line));
}

export function drawBar(ctx, layout, shown, theme, time = 0) {
  const { ui } = theme;
  const { bar, controls, row } = layout;
  const { sound, press = null, trains, rival } = shown;
  const button = Math.min(row - 12, 44);
  ctx.save();
  roundedRect(ctx, bar.x, bar.y, bar.w, bar.h, ui.radius);
  paint(ctx, ui.surface, ui.border, ui.line);
  if (trains) dots(ctx, bar.x + 24, bar.y + row / 2, trains, ui);
  if (layout.rival && rival) drawPortrait(ctx, layout.rival.x, layout.rival.y, layout.rival.size, rival, ui, { time, lang: shown.lang });
  if (controls.pause) drawRoundButton(ctx, "pause", ...centreOf(controls.pause), button, ui, { pressed: press?.kind === "pause" });
  drawSoundButtons(ctx, controls, sound, ui, { size: button, press });
  if (sound.open) drawVolumeLine(ctx, layout.volume, sound.volume, ui, { pressed: press?.kind === "volume" });
  ctx.restore();
}
