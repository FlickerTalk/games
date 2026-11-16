import { DIGITS, drawDigits, drawPortrait, drawRoundButton, drawSoundButtons, drawStar, drawVolumeLine, formatNumber } from "../../../kit/src/canvas/index.js";
import { centreOf } from "../../../kit/src/canvas/layout.js";
import { paint, roundedRect } from "../../../kit/src/canvas/pen.js";

function ribbon(ctx, area, left, ui) {
  if (area.w < 24) return;
  roundedRect(ctx, area.x, area.y, area.w, area.h, area.h / 2);
  paint(ctx, ui.track);
  const share = Math.max(0, Math.min(1, left));
  if (share <= 0) return;
  roundedRect(ctx, area.x, area.y, Math.max(area.h, area.w * share), area.h, area.h / 2);
  paint(ctx, ui.accent);
}

function scores(ctx, layout, { score, best, lang, drawOrb }, ui, time) {
  const { bar, row } = layout;
  const middle = bar.y + row / 2;
  drawOrb(ctx, bar.x + 26, middle, 22, time);
  const start = bar.x + 46;
  const width = drawDigits(ctx, formatNumber(score, lang), start, middle, DIGITS.score, ui.text);
  if (!layout.best || best === null || best === undefined) return;
  const starX = start + width + 22;
  if (starX + 60 > layout.controls.pause.x) return;
  drawStar(ctx, starX, middle, 22, true, ui);
  drawDigits(ctx, formatNumber(best, lang), starX + 15, middle, DIGITS.best, ui.text);
}

export const orbTarget = (layout) => ({ x: layout.bar.x + 26, y: layout.bar.y + layout.row / 2 });

export function drawPlayBar(ctx, layout, state, theme, time) {
  const { bar, controls, row, me } = layout;
  const { ui } = theme;
  const button = Math.min(row - 12, 44);
  ctx.save();
  roundedRect(ctx, bar.x, bar.y, bar.w, bar.h, ui.radius);
  paint(ctx, ui.surface, ui.border, ui.line);
  scores(ctx, layout, state, ui, time);
  ribbon(ctx, layout.ribbon, state.left, ui);
  if (me) {
    drawPortrait(ctx, me.x, me.y, me.size, { player: state.me.player, face: state.me.face }, ui, { time });
    drawDigits(ctx, formatNumber(state.me.score, state.lang), me.x + me.size / 2 + 6, me.y, DIGITS.best, ui.text);
  }
  if (layout.rival) drawPortrait(ctx, layout.rival.x, layout.rival.y, layout.rival.size, state.mate, ui, { time, lang: state.lang });
  drawRoundButton(ctx, "pause", ...centreOf(controls.pause), button, ui, { pressed: state.press?.kind === "pause" });
  drawSoundButtons(ctx, controls, state.sound, ui, { size: button, press: state.press });
  if (state.sound.open) drawVolumeLine(ctx, layout.volume, state.sound.volume, ui, { pressed: state.press?.kind === "volume" });
  ctx.restore();
}
