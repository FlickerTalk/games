import { drawCard, drawPresent, drawPrompt as drawPromptCard, drawRoundEnd, endLayout, promptLayout } from "../../../kit/src/canvas/index.js";
import { clamp, withRim } from "../../../kit/src/canvas/pen.js";
import { kindOf } from "../../../kit/src/progress/index.js";
import { drawPlay } from "./board.js";
import { drawConfetti, drawPaintBall } from "./effects.js";
import { PROGRESS } from "./levels.js";
import { drawLookArt } from "./looks-art.js";

function resultOf(state, scene) {
  const { outcome, player } = state;
  const rival = scene?.bar.rival;
  const players = outcome.rival && rival ? [{ player, score: outcome.score }, { player: rival.player, score: outcome.rival.score, thinking: false }] : null;
  return { stars: outcome.stars, score: outcome.score, best: outcome.best, newBest: outcome.newBest, players, gift: outcome.gift ? { look: outcome.gift, opened: outcome.opened } : null };
}

function picture(ctx, area, state, scene, theme, time) {
  const { art } = theme;
  const size = Math.min(area.h * 0.9, 84);
  const x = area.x + area.w / 2;
  withRim(ctx, { ink: art.ink, colour: art.rim }, () => {
    if (!scene || state.round?.mode === "practice") drawPaintBall(ctx, x, area.y + area.h / 2, size * 0.3, "big", art.player, art, time);
    else drawLookArt(ctx, { x: x - size / 2, y: area.y, w: size, h: area.h }, null, scene.looks[scene.mySide], theme, time);
  });
}

function present(ctx, area, { look, opened, time }, theme) {
  const { art, ui } = theme;
  if (!opened) {
    withRim(ctx, { ink: art.ink, colour: art.rim }, () => drawPresent(ctx, { x: area.x + 8, y: area.y + 6, w: area.w - 16, h: area.h - 12 }, (time % 2) / 2, art.present));
    return;
  }
  drawCard(ctx, area, ui, { chosen: true });
  drawLookArt(ctx, { x: area.x + 6, y: area.y + 6, w: area.w - 12, h: area.h - 12 }, kindOf(PROGRESS.spec.gifts, look), look, theme, time);
}

export function drawEnd(ctx, state, scene, theme, time) {
  const { width, height } = state;
  ctx.save();
  if (scene) drawPlay(ctx, { ...scene, paused: false, hint: false, pull: null, preview: null, press: null, myTurn: false, sound: { ...scene.sound, open: false }, bar: { ...scene.bar, sound: { ...scene.bar.sound, open: false } } }, theme, time);
  const layout = endLayout(width, height, { gift: true, fill: state.fill });
  drawRoundEnd(ctx, state, theme.ui, time, {
    layout,
    result: resultOf(state, scene),
    volume: state.layout?.volume,
    drawPicture: (pen, area, now) => picture(pen, area, state, scene, theme, now),
    drawGift: (pen, area, gift) => present(pen, area, gift, theme),
  });
  for (const moment of state.moments.filter((one) => one.kind === "confetti")) drawConfetti(ctx, layout.card, clamp((time * 1000 - moment.start) / moment.duration), theme.art, 5);
  ctx.restore();
}

export function drawPrompt(ctx, state, theme, time) {
  const { width, height, fill } = state;
  drawPromptCard(ctx, state, theme.ui, time, { layout: promptLayout(width, height, { fill }), player: state.player });
}
