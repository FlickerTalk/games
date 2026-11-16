import { drawCard, drawPresent, drawPrompt as drawPromptCard, drawRoundEnd, endLayout, promptLayout } from "../../../kit/src/canvas/index.js";
import { clamp } from "../../../kit/src/canvas/pen.js";
import { kindOf } from "../../../kit/src/progress/index.js";
import { standIn } from "../../../kit/src/avatars/index.js";
import { drawBall } from "./ball.js";
import { drawPlay, peopleOf } from "./board.js";
import { drawConfetti } from "./effects.js";
import { drawLookArt } from "./home-art.js";
import { PROGRESS } from "./levels.js";
import { rimmed } from "./scene.js";

function resultOf(game) {
  const { outcome } = game.state;
  const [me, rival] = peopleOf(game);
  return {
    stars: outcome.stars,
    score: outcome.mine,
    best: outcome.best,
    newBest: outcome.newBest,
    players: [{ player: me, score: outcome.mine }, { player: rival, score: outcome.theirs }],
    gift: outcome.gift ? { look: outcome.gift, opened: outcome.opened } : null,
  };
}

function picture(ctx, area, state, theme, time) {
  const size = Math.min(area.h * 0.5, 48);
  const hop = Math.abs(Math.sin(time * 2.4)) * area.h * 0.2;
  rimmed(ctx, theme, () => drawBall(ctx, area.x + area.w / 2, area.y + area.h * 0.72 - size / 2 - hop, size, state.progress.chosen.ball, theme, { rotation: time * 1.5 }));
}

function present(ctx, area, { look, opened, time }, theme) {
  if (!opened) {
    rimmed(ctx, theme, () => drawPresent(ctx, { x: area.x + 14, y: area.y + 12, w: area.w - 28, h: area.h - 24 }, (time % 2) / 2, theme.art.gift));
    return;
  }
  drawCard(ctx, area, theme.ui, { chosen: true });
  drawLookArt(ctx, { x: area.x + 6, y: area.y + 6, w: area.w - 12, h: area.h - 12 }, kindOf(PROGRESS.spec.gifts, look), look, theme, time);
}

export function drawEnd(ctx, game, theme, time) {
  const { state } = game;
  const { width, height, outcome } = state;
  if (state.round && state.layout) drawPlay(ctx, { ...game, state: { ...state, paused: false, moments: [], press: null, taught: { shoot: true, keep: true }, sound: { ...state.sound, open: false } } }, theme, time);
  const layout = endLayout(width, height, { gift: Boolean(outcome.gift), fill: state.fill });
  drawRoundEnd(ctx, state, theme.ui, time, {
    layout,
    result: resultOf(game),
    volume: state.layout?.volume,
    drawPicture: (pen, area, now) => picture(pen, area, state, theme, now),
    drawGift: (pen, area, gift) => present(pen, area, gift, theme),
  });
  for (const moment of state.moments) {
    if (moment.kind === "confetti") drawConfetti(ctx, layout.card, clamp((time * 1000 - moment.start) / moment.duration), theme);
  }
}

export function drawPrompt(ctx, state, theme, time) {
  const { width, height, fill } = state;
  drawPromptCard(ctx, state, theme.ui, time, { layout: promptLayout(width, height, { fill }), player: standIn(state.player) });
}
