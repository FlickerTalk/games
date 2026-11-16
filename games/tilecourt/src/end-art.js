import { drawCard, drawPrompt as drawPromptCard, drawRoundEnd, endLayout, promptLayout } from "../../../kit/src/canvas/index.js";
import { clamp } from "../../../kit/src/canvas/pen.js";
import { kindOf } from "../../../kit/src/progress/index.js";
import { drawPlay, rimmed } from "./board.js";
import { drawConfetti, drawEmptyBonus, drawWrapped } from "./bursts.js";
import { drawLookArt, drawMiniCourt } from "./home-art.js";
import { PROGRESS } from "./levels.js";

function resultOf({ outcome, player }, rival) {
  const theirs = rival && { player: rival.player, score: Number.isFinite(rival.score) ? rival.score : null };
  return {
    stars: outcome.stars,
    score: outcome.score,
    best: outcome.best,
    newBest: outcome.newBest,
    players: theirs ? [{ player, score: outcome.score }, theirs] : null,
    gift: outcome.gift ? { look: outcome.gift, opened: outcome.opened } : null,
  };
}

function picture(ctx, area, outcome, theme, time) {
  const x = area.x + area.w / 2;
  rimmed(ctx, theme, () => {
    if (outcome.over === "full") drawMiniCourt(ctx, { x: x - 40, y: area.y, w: 80, h: area.h }, "main", theme);
    else drawEmptyBonus(ctx, x, area.y + area.h * 0.75, 110, 0.2 + ((time * 0.3) % 0.6), theme);
  });
}

function present(ctx, area, { look, opened, time }, theme) {
  if (!opened) {
    rimmed(ctx, theme, () => drawWrapped(ctx, { x: area.x + 8, y: area.y + 6, w: area.w - 16, h: area.h - 12 }, (time % 2) / 2, theme));
    return;
  }
  drawCard(ctx, area, theme.ui, { chosen: true });
  drawLookArt(ctx, { x: area.x + 6, y: area.y + 6, w: area.w - 12, h: area.h - 12 }, kindOf(PROGRESS.spec.gifts, look), look, theme, time);
}

export function drawEnd(ctx, state, rival, theme, time) {
  const { width, height, outcome } = state;
  ctx.save();
  if (state.round && state.layout) drawPlay(ctx, { ...state, paused: false, hint: null, drag: { phase: "idle" }, moments: [], press: null, sound: { ...state.sound, open: false } }, theme, time);
  const layout = endLayout(width, height, { gift: true, fill: state.fill });
  drawRoundEnd(ctx, state, theme.ui, time, {
    layout,
    result: resultOf(state, rival),
    volume: state.layout?.volume,
    drawPicture: (pen, area, now) => picture(pen, area, outcome, theme, now),
    drawGift: (pen, area, gift) => present(pen, area, gift, theme),
  });
  for (const moment of state.moments) {
    if (moment.kind === "confetti") drawConfetti(ctx, layout.card, clamp((time * 1000 - moment.start) / moment.duration), 5, theme);
  }
  ctx.restore();
}

export function drawPrompt(ctx, state, theme, time) {
  const { width, height, fill } = state;
  drawPromptCard(ctx, state, theme.ui, time, { layout: promptLayout(width, height, { fill }), player: state.player });
}
