import { drawPortrait, drawSoundButtons, drawVolumeLine } from "../../../kit/src/canvas/bar.js";
import { drawRoundButton } from "../../../kit/src/canvas/buttons.js";
import { centreOf } from "../../../kit/src/canvas/layout.js";
import { circle, line, paint, roundedRect, withRim } from "../../../kit/src/canvas/pen.js";
import { drawJar } from "./jar-art.js";

const STEP_MOST = 22;

function dots(ctx, { x, y, w }, { total, done }, ui) {
  if (w < 40 || total < 1) return;
  const step = total > 1 ? Math.min(STEP_MOST, w / (total - 1)) : 0;
  const radius = Math.max(3, Math.min(7, step * 0.34));
  line(ctx, [[x, y], [x + step * (total - 1), y]], ui.track, 4);
  for (let at = 0; at < total; at += 1) {
    const here = at === done;
    circle(ctx, x + step * at, y, here ? radius + 2 : radius, at < done ? ui.accent : ui.surface2, at <= done ? ui.accent : ui.border, ui.line);
  }
}

export function drawBar(ctx, layout, shown, theme, time = 0) {
  const { ui, art } = theme;
  const { bar, controls, row, jar } = layout;
  const { sound, press = null, mate } = shown;
  const pressed = (kind) => press?.kind === kind;
  const button = Math.min(row - 12, 44);
  ctx.save();
  roundedRect(ctx, bar.x, bar.y, bar.w, bar.h, ui.radius);
  paint(ctx, ui.surface, ui.border, ui.line);
  withRim(ctx, { ink: art.ink, colour: art.rim }, () => drawJar(ctx, jar.x, jar.y, jar.size, shown.fill, theme, time));
  dots(ctx, layout.dots, shown.golems, ui);
  if (layout.rival && mate) drawPortrait(ctx, layout.rival.x, layout.rival.y, layout.rival.size, mate, ui, { time, lang: shown.lang });
  if (controls.pause) drawRoundButton(ctx, "pause", ...centreOf(controls.pause), button, ui, { pressed: pressed("pause") });
  drawSoundButtons(ctx, controls, sound, ui, { size: button, press });
  if (sound.open) drawVolumeLine(ctx, layout.volume, sound.volume, ui, { pressed: pressed("volume") });
  ctx.restore();
}
