import { drawPortrait, drawRoundButton, drawSoundButtons, drawVolumeLine } from "../../../kit/src/canvas/index.js";
import { centreOf } from "../../../kit/src/canvas/layout.js";
import { circle, line, paint, polygon, roundedRect } from "../../../kit/src/canvas/pen.js";
import { rimmed } from "./paddles.js";

const GAP_SHARE = 0.5;

export function drawScoreLights(ctx, x, y, score, ui, { shape = "circle", size = 18 } = {}) {
  const gap = size * GAP_SHARE;
  const span = size * 5 + gap * 4;
  ctx.save();
  for (let at = 0; at < 5; at += 1) {
    const px = x - span / 2 + size / 2 + at * (size + gap);
    const lit = at < score;
    const fill = lit ? ui.accent : ui.surface2;
    const edge = lit ? ui.accent : ui.muted;
    if (shape === "diamond") polygon(ctx, [[px, y - size / 2], [px + size / 2, y], [px, y + size / 2], [px - size / 2, y]], fill, edge, ui.line);
    else circle(ctx, px, y, size / 2 - ui.line / 2, fill, edge, ui.line);
    if (lit) circle(ctx, px - size * 0.14, y - size * 0.16, size * 0.1, ui.onAccent);
  }
  ctx.restore();
}

export function drawDragZone(ctx, x, y, width, height, theme, { active = false } = {}) {
  const { effects, ink } = theme.art;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = "round";
  ctx.setLineDash([9, 10]);
  roundedRect(ctx, -width / 2, -height / 2, width, height, height * 0.42);
  if (active) {
    ctx.save();
    ctx.globalAlpha = 0.45;
    paint(ctx, effects.zoneFill);
    ctx.restore();
  }
  paint(ctx, null, effects.zone, 3);
  ctx.setLineDash([]);
  const py = height * 0.29;
  rimmed(ctx, theme, () => {
    line(ctx, [[-24, py], [24, py]], ink, 3);
    polygon(ctx, [[-31, py], [-21, py - 7], [-21, py + 7]], ink);
    polygon(ctx, [[31, py], [21, py - 7], [21, py + 7]], ink);
  });
  ctx.restore();
}

function timeLine(ctx, area, left, ui) {
  roundedRect(ctx, area.x, area.y, area.w, area.h, area.h / 2);
  paint(ctx, ui.track, null, 0);
  const share = Math.max(0, Math.min(1, left));
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
  const line = { x: start + face + 10, y: middle - 5, w: end - start - 2 * face - 20, h: 10 };
  if (line.w >= 24) timeLine(ctx, line, state.left, ui);
  drawRoundButton(ctx, "pause", ...centreOf(controls.pause), Math.min(row - 12, 44), ui, { pressed: state.press?.kind === "pause" });
  drawSoundButtons(ctx, controls, state.sound, ui, { size: Math.min(row - 12, 44), press: state.press });
  if (state.sound.open) drawVolumeLine(ctx, layout.volume, state.sound.volume, ui, { pressed: state.press?.kind === "volume" });
  ctx.restore();
}
