import { DIGITS, drawDigits, drawPortrait, drawRoundButton, drawSoundButtons, drawStar, drawVolumeLine, formatNumber } from "../../../kit/src/canvas/index.js";
import { centreOf } from "../../../kit/src/canvas/layout.js";
import { paint, roundedRect } from "../../../kit/src/canvas/pen.js";
import { drawBalloon } from "./balloons.js";

function ribbon(ctx, area, left, ui) {
  if (area.w < 24) return;
  roundedRect(ctx, area.x, area.y, area.w, area.h, area.h / 2);
  paint(ctx, ui.track);
  const share = Math.max(0, Math.min(1, left));
  if (share <= 0) return;
  roundedRect(ctx, area.x, area.y, Math.max(area.h, area.w * share), area.h, area.h / 2);
  paint(ctx, ui.accent);
}

function scores(ctx, layout, { score, best, lang }, theme) {
  const { bar, row } = layout;
  const { ui } = theme;
  const middle = bar.y + row / 2;
  const icon = row * 0.42;
  drawBalloon(ctx, bar.x + 12 + icon / 2, middle - icon * 0.2, icon, "round", theme, { sway: false });
  const start = bar.x + 20 + icon;
  const width = drawDigits(ctx, formatNumber(score, lang), start, middle, DIGITS.score, ui.text);
  if (!layout.best || best === null || best === undefined) return;
  const starX = start + width + 22;
  drawStar(ctx, starX, middle, 22, true, ui);
  drawDigits(ctx, formatNumber(best, lang), starX + 15, middle, DIGITS.best, ui.text);
}

export function drawPlayBar(ctx, layout, state, theme, time) {
  const { bar, controls, row } = layout;
  const { ui } = theme;
  const button = Math.min(row - 12, 44);
  ctx.save();
  roundedRect(ctx, bar.x, bar.y, bar.w, bar.h, ui.radius);
  paint(ctx, ui.surface, ui.border, ui.line);
  scores(ctx, layout, state, theme);
  ribbon(ctx, layout.ribbon, state.left, ui);
  if (layout.rival && state.rival) drawPortrait(ctx, layout.rival.x, layout.rival.y, layout.rival.size, { ...state.rival, face: "happy" }, ui, { time, lang: state.lang });
  drawRoundButton(ctx, "pause", ...centreOf(controls.pause), button, ui, { pressed: state.press?.kind === "pause" });
  drawSoundButtons(ctx, controls, state.sound, ui, { size: button, press: state.press });
  if (state.sound.open) drawVolumeLine(ctx, layout.volume, state.sound.volume, ui, { pressed: state.press?.kind === "volume" });
  ctx.restore();
}
