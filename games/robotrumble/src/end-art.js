import { drawCard, drawPresent, drawRoundEnd, endLayout } from "../../../kit/src/canvas/index.js";
import { clamp } from "../../../kit/src/canvas/pen.js";
import { kindOf } from "../../../kit/src/progress/index.js";
import { drawPlay, rivalOf } from "./board.js";
import { drawLookArt } from "./home-art.js";
import { PROGRESS } from "./levels.js";
import { drawConfetti } from "./parts.js";
import { drawRobot } from "./robots.js";

function resultOf(state) {
  const { outcome, player } = state;
  return {
    stars: outcome.stars,
    score: outcome.mine,
    best: outcome.best,
    newBest: outcome.newBest,
    players: [{ player, score: outcome.mine }, { player: rivalOf(outcome.kind, player), score: outcome.theirs }],
    gift: outcome.gift ? { look: outcome.gift, opened: outcome.opened } : null,
  };
}

function picture(ctx, area, state, theme, time) {
  const size = Math.min(area.w * 0.4, area.h * 0.72, 120);
  const pose = state.outcome.mine >= state.outcome.theirs ? "cheer" : "idle";
  drawRobot(ctx, area.x + area.w / 2, area.y + area.h * 0.94, size, theme, { variant: state.progress.chosen.robot, pose, time, player: state.player });
}

function present(ctx, area, { look, opened, time }, state, theme) {
  if (!opened) {
    drawPresent(ctx, { x: area.x + area.w * 0.14, y: area.y + area.h * 0.12, w: area.w * 0.72, h: area.h * 0.76 }, (time * 0.6) % 1, theme.art.gift);
    return;
  }
  drawCard(ctx, area, theme.ui, { chosen: true });
  drawLookArt(ctx, { x: area.x + 6, y: area.y + 6, w: area.w - 12, h: area.h - 12 }, kindOf(PROGRESS.spec.gifts, look), look, theme, { time, player: state.player });
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
    drawGift: (pen, area, gift) => present(pen, area, gift, state, theme),
  });
  for (const moment of state.moments) {
    if (moment.kind !== "confetti") continue;
    drawConfetti(ctx, layout.card.x + layout.card.w / 2, layout.card.y + layout.card.h * 0.2, layout.card.w * 0.8, theme, clamp((time * 1000 - moment.start) / moment.duration));
  }
}
