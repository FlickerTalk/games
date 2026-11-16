import { drawCard, drawRoundEnd, endLayout } from "../../../kit/src/canvas/index.js";
import { clamp, paint, roundedRect } from "../../../kit/src/canvas/pen.js";
import { drawBalloon } from "./balloons.js";
import { drawPlay, rivalOf } from "./board.js";
import { drawLookArt, drawWrapped } from "./home-art.js";
import { drawToy } from "./toys.js";

function resultOf(state) {
  const { outcome, player } = state;
  const rival = rivalOf(state);
  return {
    stars: outcome.stars,
    score: outcome.mine,
    best: outcome.best,
    newBest: outcome.newBest,
    players: rival && outcome.theirs !== null ? [{ player, score: outcome.mine }, { player: rival, score: outcome.theirs }] : null,
    gift: outcome.gift ? { look: outcome.gift, opened: outcome.opened } : null,
  };
}

function picture(ctx, area, state, theme, time) {
  const size = Math.min(area.w * 0.3, area.h * 0.72, 96);
  const x = area.x + area.w / 2;
  const y = area.y + area.h / 2;
  drawToy(ctx, state.tool, x - size * 0.6, y + size * 0.05, size, theme, { pull: 0.3 });
  drawBalloon(ctx, x + size * 0.6, y - size * 0.15, size * 0.62, "round", theme, { time });
}

function present(ctx, area, { look, opened, time }, theme) {
  if (!opened) {
    drawWrapped(ctx, { x: area.x + 14, y: area.y + 10, w: area.w - 28, h: area.h - 20 }, (time % 2) / 2, theme);
    return;
  }
  drawCard(ctx, area, theme.ui, { chosen: true });
  drawLookArt(ctx, { x: area.x + 3, y: area.y + 3, w: area.w - 6, h: area.h - 6 }, look, theme, time);
}

function confetti(ctx, area, progress, theme) {
  const p = clamp(progress);
  const colours = theme.art.effects.confetti;
  ctx.save();
  for (let at = 0; at < 24; at += 1) {
    ctx.save();
    ctx.translate(area.x + (((at * 47) % 101) / 100) * area.w, area.y + p * (90 + (at % 5) * 18) - Math.sin(p * Math.PI) * (30 + (at % 4) * 12));
    ctx.rotate(p * 5 + at);
    roundedRect(ctx, -3, -6, 6, 12, 2);
    paint(ctx, colours[at % colours.length]);
    ctx.restore();
  }
  ctx.restore();
}

export function drawEnd(ctx, game, theme, time) {
  const { state } = game;
  const { width, height, outcome } = state;
  if (state.round && state.layout) drawPlay(ctx, { ...game, state: { ...state, paused: false, moments: [], press: null, taught: [state.round.tool.kind], sound: { ...state.sound, open: false } } }, theme, time);
  const layout = endLayout(width, height, { gift: Boolean(outcome.gift), fill: state.fill });
  drawRoundEnd(ctx, state, theme.ui, time, {
    layout,
    result: resultOf(state),
    volume: state.layout?.volume,
    drawPicture: (pen, area, now) => picture(pen, area, state, theme, now),
    drawGift: (pen, area, gift) => present(pen, area, gift, theme),
  });
  for (const moment of state.moments) {
    if (moment.kind === "confetti") confetti(ctx, layout.card, (time * 1000 - moment.start) / moment.duration, theme);
  }
}
