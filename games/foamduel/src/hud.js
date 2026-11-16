import { DIGITS, drawDigits, drawPortrait, drawRoundButton, drawSoundButtons, drawVolumeLine, formatNumber } from "../../../kit/src/canvas/index.js";
import { centreOf } from "../../../kit/src/canvas/layout.js";
import { circle, paint, roundedRect } from "../../../kit/src/canvas/pen.js";
import { drawHelmetBalloon, drawSword, rimmed } from "./knights.js";

function ribbon(ctx, area, left, ui) {
  if (area.w < 24) return;
  roundedRect(ctx, area.x, area.y, area.w, area.h, area.h / 2);
  paint(ctx, ui.track);
  const share = Math.max(0, Math.min(1, left));
  if (share <= 0) return;
  roundedRect(ctx, area.x, area.y, Math.max(area.h, area.w * share), area.h, area.h / 2);
  paint(ctx, ui.accent);
}

function score(ctx, layout, state, theme) {
  const { bar, row } = layout;
  const middle = bar.y + row / 2;
  const icon = row * 0.46;
  rimmed(ctx, theme, () => drawHelmetBalloon(ctx, bar.x + 14 + icon / 2, middle - icon * 0.04, icon, "theirs", theme));
  drawDigits(ctx, formatNumber(state.score, state.lang), bar.x + 24 + icon, middle, DIGITS.score, theme.ui.text);
}

export function drawPlayBar(ctx, layout, state, theme, time) {
  const { bar, controls, row } = layout;
  const { ui } = theme;
  const button = Math.min(row - 12, 44);
  ctx.save();
  roundedRect(ctx, bar.x, bar.y, bar.w, bar.h, ui.radius);
  paint(ctx, ui.surface, ui.border, ui.line);
  score(ctx, layout, state, theme);
  ribbon(ctx, layout.ribbon, state.left, ui);
  if (layout.rival && state.rival) drawPortrait(ctx, layout.rival.x, layout.rival.y, layout.rival.size, { ...state.rival, face: "happy" }, ui, { time, lang: state.lang });
  drawRoundButton(ctx, "pause", ...centreOf(controls.pause), button, ui, { pressed: state.press?.kind === "pause" });
  drawSoundButtons(ctx, controls, state.sound, ui, { size: button, press: state.press });
  if (state.sound.open) drawVolumeLine(ctx, layout.volume, state.sound.volume, ui, { pressed: state.press?.kind === "volume" });
  ctx.restore();
}

// index 0 is the first player's pad, a circle; index 1 the second player's, a rounded square
export function drawPad(ctx, pad, index, theme, { sword, pressed = false }) {
  const { ui } = theme;
  const [x, y] = centreOf(pad);
  const size = Math.min(pad.w, pad.h);
  const inner = size * (pressed ? 0.94 : 1);
  ctx.save();
  ctx.beginPath();
  if (index === 1) roundedRect(ctx, x - inner / 2, y - inner / 2, inner, inner, inner * 0.28);
  else ctx.arc(x, y, inner / 2 - ui.line, 0, Math.PI * 2);
  paint(ctx, pressed ? ui.pressed : ui.surface, pressed ? ui.accent : ui.border, ui.line * 1.5);
  if (index === 1) {
    roundedRect(ctx, x - inner * 0.4, y - inner * 0.4, inner * 0.8, inner * 0.8, inner * 0.2);
    paint(ctx, ui.surface2);
  } else circle(ctx, x, y, inner * 0.4, ui.surface2);
  rimmed(ctx, theme, () => drawSword(ctx, x - inner * 0.13, y + inner * 0.17, inner * 0.5, sword, 0.65, theme));
  ctx.restore();
}
