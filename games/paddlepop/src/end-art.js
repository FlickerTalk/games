import { standIn } from "../../../kit/src/avatars/index.js";
import { drawCard, drawRoundEnd, endLayout } from "../../../kit/src/canvas/index.js";
import { clamp } from "../../../kit/src/canvas/pen.js";
import { kindOf } from "../../../kit/src/progress/index.js";
import { drawPlay } from "./board.js";
import { drawConfetti } from "./bursts.js";
import { drawLookArt } from "./home-art.js";
import { PROGRESS } from "./levels.js";
import { drawPaddle, drawWrappedPaddle } from "./paddles.js";
import { drawBall } from "./things.js";

const FLICK = Object.freeze({ who: "flick" });

function resultOf(state) {
  const { outcome, player } = state;
  const rival = outcome.kind === "flick" ? FLICK : standIn(player);
  return {
    stars: outcome.stars,
    score: outcome.mine,
    best: outcome.best,
    newBest: outcome.newBest,
    players: [{ player, score: outcome.mine }, { player: rival, score: outcome.theirs }],
    gift: outcome.gift ? { look: outcome.gift, opened: outcome.opened } : null,
  };
}

function picture(ctx, area, state, theme, time) {
  const size = Math.min(area.w * 0.5, area.h * 1.6, 150);
  const x = area.x + area.w / 2;
  const y = area.y + area.h * 0.7;
  drawPaddle(ctx, state.progress.chosen.paddle, x, y, size, theme, { time });
  drawBall(ctx, x + Math.sin(time * 2) * size * 0.2, y - size * 0.42, size * 0.1, theme, { time, angle: Math.PI / 2 });
}

function present(ctx, area, { look, opened, time }, theme) {
  if (!opened) {
    drawWrappedPaddle(ctx, look, area.x + area.w / 2, area.y + area.h / 2, Math.min(area.w, area.h) * 0.8, theme, time);
    return;
  }
  drawCard(ctx, area, theme.ui, { chosen: true });
  drawLookArt(ctx, { x: area.x + 6, y: area.y + 6, w: area.w - 12, h: area.h - 12 }, kindOf(PROGRESS.spec.gifts, look), look, theme, time);
}

export function drawEnd(ctx, game, theme, time) {
  const { state } = game;
  const { width, height, outcome } = state;
  if (state.round && state.layout) drawPlay(ctx, { ...game, state: { ...state, paused: false, moments: [], press: null, taught: true, sound: { ...state.sound, open: false } } }, theme, time);
  const layout = endLayout(width, height, { gift: Boolean(outcome.gift), fill: state.fill });
  drawRoundEnd(ctx, state, theme.ui, time, {
    layout,
    result: resultOf(state),
    volume: state.layout?.volume,
    drawPicture: (pen, area, now) => picture(pen, area, state, theme, now),
    drawGift: (pen, area, gift) => present(pen, area, gift, theme),
  });
  for (const moment of state.moments) {
    if (moment.kind === "confetti") drawConfetti(ctx, layout.card, clamp((time * 1000 - moment.start) / moment.duration), theme);
  }
}
