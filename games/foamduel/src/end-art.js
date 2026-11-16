import { drawCard, drawRoundEnd, endLayout } from "../../../kit/src/canvas/index.js";
import { kindOf } from "../../../kit/src/progress/index.js";
import { drawPlay, rivalOf } from "./board.js";
import { drawConfetti } from "./effects.js";
import { drawLookArt, drawWrapped } from "./home-art.js";
import { drawHelmetBalloon, drawSword, rimmed } from "./knights.js";
import { PROGRESS } from "./levels.js";

function resultOf(state) {
  const { outcome, player } = state;
  return {
    stars: outcome.stars,
    score: outcome.mine,
    best: outcome.best,
    newBest: outcome.newBest,
    players: [{ player, score: outcome.mine }, { player: rivalOf(state), score: outcome.theirs }],
    gift: outcome.gift ? { look: outcome.gift, opened: outcome.opened } : null,
  };
}

function picture(ctx, area, state, theme, time) {
  const size = Math.min(area.w * 0.3, area.h * 0.8, 96);
  const x = area.x + area.w / 2;
  const y = area.y + area.h / 2;
  rimmed(ctx, theme, () => {
    drawSword(ctx, x - size * 0.5, y + size * 0.42, size, state.progress.chosen.sword, 0.5, theme);
    drawHelmetBalloon(ctx, x + size * 0.5, y - size * 0.05, size * 0.6, "theirs", theme, { time });
  });
}

function present(ctx, area, { look, opened, time }, theme) {
  if (!opened) {
    drawWrapped(ctx, { x: area.x + 14, y: area.y + 10, w: area.w - 28, h: area.h - 20 }, (time % 2) / 2, theme);
    return;
  }
  drawCard(ctx, area, theme.ui, { chosen: true });
  drawLookArt(ctx, { x: area.x + 3, y: area.y + 3, w: area.w - 6, h: area.h - 6 }, kindOf(PROGRESS.spec.gifts, look), look, theme, time);
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
    if (moment.kind === "confetti") drawConfetti(ctx, layout.card, (time * 1000 - moment.start) / moment.duration, theme);
  }
}
