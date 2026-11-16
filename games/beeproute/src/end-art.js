import { drawCard, drawRoundEnd, endLayout } from "../../../kit/src/canvas/index.js";
import { kindOf } from "../../../kit/src/progress/index.js";
import { driverOf, drawPlay, rimmed } from "./board.js";
import { drawConfetti } from "./effects-art.js";
import { drawLookArt } from "./home-art.js";
import { PROGRESS } from "./levels.js";
import { drawGiftBox, drawRobot } from "./robot-art.js";

const progressOf = (moment, time) => Math.min(1, Math.max(0, (time * 1000 - moment.start) / moment.duration));

function resultOf({ outcome }) {
  return {
    stars: outcome.stars,
    score: outcome.count,
    best: outcome.best,
    newBest: outcome.newBest,
    gift: outcome.gift ? { look: outcome.gift, opened: outcome.opened } : null,
  };
}

function picture(ctx, area, state, theme, time) {
  const size = Math.min(area.h * 0.85, area.w * 0.5, 96);
  rimmed(ctx, theme, () => drawRobot(ctx, area.x + area.w / 2, area.y + area.h / 2, size, { ...driverOf(state), pose: "cheer", time }, theme));
}

function present(ctx, area, { look, opened, time }, state, theme) {
  if (!opened) {
    rimmed(ctx, theme, () => drawGiftBox(ctx, { x: area.x + 8, y: area.y + 6, w: area.w - 16, h: area.h - 12 }, (time % 2) / 2, theme));
    return;
  }
  drawCard(ctx, area, theme.ui, { chosen: true });
  drawLookArt(ctx, { x: area.x + 6, y: area.y + 6, w: area.w - 12, h: area.h - 12 }, kindOf(PROGRESS.spec.gifts, look), look, state, theme, time);
}

export function drawEnd(ctx, state, theme, time) {
  const { width, height, fill } = state;
  ctx.save();
  if (state.round && state.layout) drawPlay(ctx, { ...state, paused: false, hint: null, moments: [], press: null, sound: { ...state.sound, open: false } }, theme, time);
  const layout = endLayout(width, height, { gift: true, fill });
  drawRoundEnd(ctx, state, theme.ui, time, {
    layout,
    result: resultOf(state),
    volume: state.layout?.volume,
    drawPicture: (pen, area, now) => picture(pen, area, state, theme, now),
    drawGift: (pen, area, gift) => present(pen, area, gift, state, theme),
  });
  for (const moment of state.moments) {
    if (moment.kind === "confetti") drawConfetti(ctx, layout.card, progressOf(moment, time), 5, theme);
  }
  ctx.restore();
}
