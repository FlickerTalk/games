import { centreOf, drawCard, drawPause, drawRoundButton, pauseLayout } from "../../../kit/src/canvas/index.js";
import { circle, clamp, mix, paint, polygon } from "../../../kit/src/canvas/pen.js";
import { drawBar } from "./bar-art.js";
import { barShown, drawRails, drawStage, horizonOf, rimmed, sidingWagon } from "./board.js";
import { drawNotePop, drawPuff } from "./effects-art.js";
import { drawEngine } from "./engine-art.js";
import { popsAt, tuneAt } from "./playing.js";
import { MOST, wagonOf } from "./train.js";
import { drawGap, drawWagon } from "./wagon-art.js";

export function undoGlyph(ctx, s, colour) {
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.25, -Math.PI * 0.8, Math.PI * 0.65);
  paint(ctx, null, colour, s * 0.09);
  polygon(ctx, [[-s * 0.32, -s * 0.28], [-s * 0.34, s * 0.02], [-s * 0.08, -s * 0.08]], colour);
}

export function sendGlyph(ctx, s, colour) {
  polygon(ctx, [[-s * 0.3, -s * 0.22], [s * 0.32, 0], [-s * 0.3, s * 0.22], [-s * 0.14, 0]], colour);
}

function beatsButton(ctx, area, beats, pressed, ui) {
  const [x, y] = centreOf(area);
  const size = Math.min(area.w, area.h);
  circle(ctx, x, y, (size / 2 - ui.line / 2) * (pressed ? 0.94 : 1), pressed ? ui.pressed : ui.surface, pressed ? ui.accent : ui.border, ui.line);
  const radius = Math.max(4, size * 0.07);
  for (let dot = 0; dot < 3; dot += 1) circle(ctx, x + (dot - 1) * radius * 3, y, radius, dot < beats ? ui.text : ui.surface2, dot < beats ? ui.text : ui.muted, ui.line);
}

function controls(ctx, state, theme, time) {
  const { layout, build, press, mode } = state;
  const { ui } = theme;
  const shake = state.moments.find((moment) => moment.kind === "shake" && moment.target === "send");
  const shaken = shake ? clamp((time * 1000 - shake.start) / shake.duration) : 0;
  for (const target of layout.buttons) {
    const pressed = Boolean(press && press.kind === target.kind && press.value === target.value);
    const [x, y] = centreOf(target);
    if (target.kind === "wagon") {
      drawCard(ctx, target, ui, { pressed });
      const spot = sidingWagon(target);
      rimmed(ctx, theme, () => drawWagon(ctx, spot.x, spot.y, spot.size, wagonOf(target.value, build.beats), { time }, theme));
    } else if (target.kind === "undo") drawRoundButton(ctx, undoGlyph, x, y, target.w - 8, ui, { pressed });
    else if (target.kind === "dots") beatsButton(ctx, target, build.beats, pressed, ui);
    else {
      const ready = mode === "alone" ? build.wagons.length > 0 : build.check.ok;
      ctx.save();
      if (!ready) ctx.globalAlpha = 0.45;
      drawRoundButton(ctx, mode === "alone" ? "play" : sendGlyph, x + Math.sin(shaken * Math.PI * 6) * 6 * (1 - shaken) * (shake ? 1 : 0), y, target.w, ui, { primary: true, pressed });
      ctx.restore();
    }
  }
}

function trainOf(ctx, state, theme, time) {
  const { build, layout, player } = state;
  const { train } = layout;
  const now = time * 1000;
  const tune = build.tune ? tuneAt(build.wagons, build.tune.start, now) : null;
  drawEngine(ctx, train.engineX, train.y - train.size * 0.06, train.engine, state.progress.chosen.engine, { pose: tune ? "dancing" : "idle", time, pilot: player }, theme);
  build.wagons.forEach((wagon, at) => {
    if (build.hidden[at]) drawGap(ctx, train.xs[at], train.y, train.size, { time, hint: wagon }, theme);
    else drawWagon(ctx, train.xs[at], train.y, train.size, wagon, { time, hop: tune?.index === at ? tune.within : 0 }, theme);
  });
  if (build.wagons.length < MOST && !tune) drawGap(ctx, train.xs[build.wagons.length], train.y, train.size, { faint: true }, theme);
  if (!build.tune) return;
  for (const pop of popsAt(build.wagons, build.tune.start, now)) drawNotePop(ctx, train.xs[pop.index], train.y - train.size * 0.55, train.size, build.wagons[pop.index], pop.progress, theme);
  if (tune && tune.progress < 1) drawPuff(ctx, mix(train.engineX, train.xs[build.wagons.length - 1] + train.size * 0.5, tune.progress), train.y - train.size * 1.05, train.size, time, theme);
}

export function drawCompose(ctx, state, theme, time) {
  const { build, layout } = state;
  if (!build || !layout) return;
  ctx.save();
  drawStage(ctx, state, theme, horizonOf(layout.train));
  drawRails(ctx, state, layout.train, theme);
  rimmed(ctx, theme, () => trainOf(ctx, state, theme, time));
  controls(ctx, state, theme, time);
  drawBar(ctx, layout, barShown(state), theme, time);
  if (state.paused) drawPause(ctx, state, theme.ui, { layout: pauseLayout(state.width, state.height, { fill: state.fill }) });
  ctx.restore();
}
