import { drawPortrait, drawRoundButton, drawSoundButtons, drawVolumeLine } from "../../../kit/src/canvas/index.js";
import { centreOf } from "../../../kit/src/canvas/layout.js";
import { clamp, paint, roundedRect } from "../../../kit/src/canvas/pen.js";

function timeLine(ctx, area, left, ui) {
  roundedRect(ctx, area.x, area.y, area.w, area.h, area.h / 2);
  paint(ctx, ui.track, null, 0);
  const share = clamp(left);
  if (share <= 0) return;
  roundedRect(ctx, area.x, area.y, Math.max(area.h, area.w * share), area.h, area.h / 2);
  paint(ctx, ui.accent, null, 0);
}

export function drawPlayBar(ctx, layout, state, theme, time) {
  const { bar, controls, row } = layout;
  const { ui } = theme;
  const face = row - 12;
  const middle = bar.y + bar.h / 2;
  const start = bar.x + 8;
  const end = controls.pause.x - 6;
  ctx.save();
  roundedRect(ctx, bar.x, bar.y, bar.w, bar.h, ui.radius);
  paint(ctx, ui.surface, ui.border, ui.line);
  drawPortrait(ctx, start + face / 2, middle, face, { player: state.me, face: "happy" }, ui, { time });
  if (state.rival) drawPortrait(ctx, end - face / 2, middle, face, { player: state.rival, face: "happy" }, ui, { time });
  const track = { x: start + face + 10, y: middle - 5, w: end - start - 2 * face - 20, h: 10 };
  if (track.w >= 24) timeLine(ctx, track, state.left, ui);
  drawRoundButton(ctx, "pause", ...centreOf(controls.pause), Math.min(row - 12, 44), ui, { pressed: state.press?.kind === "pause" });
  drawSoundButtons(ctx, controls, state.sound, ui, { size: Math.min(row - 12, 44), press: state.press });
  if (state.sound.open) drawVolumeLine(ctx, layout.volume, state.sound.volume, ui, { pressed: state.press?.kind === "volume" });
  ctx.restore();
}
