import { standIn } from "../../../kit/src/avatars/index.js";
import { drawCard, drawPresent, drawRoundEnd, endLayout } from "../../../kit/src/canvas/index.js";
import { clamp } from "../../../kit/src/canvas/pen.js";
import { kindOf } from "../../../kit/src/progress/index.js";
import { drawPlay } from "./board.js";
import { drawConfetti } from "./effects.js";
import { drawLookArt } from "./home-art.js";
import { PROGRESS } from "./levels.js";
import { drawPlayer } from "./players.js";

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
  const size = Math.min(area.w * 0.4, area.h / 1.5, 130);
  if (size < 36) return;
  const { outcome, progress, player } = state;
  drawPlayer(ctx, area.x + area.w / 2, area.y + area.h - size * 0.24, size, player, theme, { ring: progress.chosen.ring, pose: outcome.won ? "cheer" : "idle", time });
}

function present(ctx, area, { look, opened }, theme, time) {
  if (!opened) {
    drawPresent(ctx, area, 0, theme.art.gift);
    return;
  }
  drawCard(ctx, area, theme.ui, { chosen: true });
  drawLookArt(ctx, area, kindOf(PROGRESS.spec.gifts, look), look, theme, time);
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
    drawGift: (pen, area, gift) => present(pen, area, gift, theme, time),
  });
  for (const moment of state.moments) {
    if (moment.kind === "confetti") drawConfetti(ctx, layout.card, clamp((time * 1000 - moment.start) / moment.duration), theme);
  }
}
