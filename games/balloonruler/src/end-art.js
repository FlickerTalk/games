import { endLayout, promptLayout } from "../../../kit/src/canvas/menu-layout.js";
import { drawRoundEnd } from "../../../kit/src/canvas/round-end.js";
import { drawCard, drawPrompt as drawPromptCard } from "../../../kit/src/canvas/screens.js";
import { kindOf } from "../../../kit/src/progress/index.js";
import { drawBalloon } from "./balloons.js";
import { drawPlay, rimmed } from "./board.js";
import { drawLookArt, drawWrapped } from "./home-art.js";
import { PROGRESS } from "./levels.js";

function resultOf({ outcome, player }, rival) {
  return {
    stars: outcome.stars,
    score: outcome.score,
    best: outcome.best,
    newBest: outcome.newBest,
    players: rival ? [{ player, score: outcome.score }, { player: rival.player, score: rival.score, thinking: rival.thinking }] : null,
    gift: outcome.gift ? { look: outcome.gift, opened: outcome.opened } : null,
  };
}

function picture(ctx, area, theme, time) {
  const size = Math.min(area.h * 0.5, area.w / 5, 44);
  const x = area.x + area.w / 2;
  const y = area.y + area.h * 0.36;
  rimmed(ctx, theme, () => {
    [[-0.8, 0.12, 3], [0.8, 0.1, 1], [0, -0.05, 0]].forEach(([dx, dy, colour]) => drawBalloon(ctx, x + dx * size, y + dy * size, size, { colour, time, string: size * 0.75 - dy * size }, theme));
  });
}

function present(ctx, area, { look, opened, time }, theme) {
  if (!opened) {
    drawWrapped(ctx, { x: area.x + 8, y: area.y + 6, w: area.w - 16, h: area.h - 12 }, (time % 2) / 2, theme);
    return;
  }
  drawCard(ctx, area, theme.ui, { chosen: true });
  drawLookArt(ctx, { x: area.x + 6, y: area.y + 6, w: area.w - 12, h: area.h - 12 }, kindOf(PROGRESS.spec.gifts, look), look, theme, time);
}

export function drawEnd(ctx, state, rival, theme, time) {
  const { width, height } = state;
  ctx.save();
  if (state.round && state.layout) drawPlay(ctx, { ...state, paused: false, hint: false, aim: null, last: null, press: null, sound: { ...state.sound, open: false } }, theme, time);
  drawRoundEnd(ctx, state, theme.ui, time, {
    layout: endLayout(width, height, { gift: true, fill: state.fill }),
    result: resultOf(state, rival),
    volume: state.layout?.volume,
    drawPicture: (pen, area, now) => picture(pen, area, theme, now),
    drawGift: (pen, area, gift) => present(pen, area, gift, theme),
  });
  ctx.restore();
}

export function drawPrompt(ctx, state, player, theme, time) {
  const { width, height, fill } = state;
  drawPromptCard(ctx, state, theme.ui, time, { layout: promptLayout(width, height, { fill }), player });
}
