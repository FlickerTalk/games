import { endLayout } from "../../../kit/src/canvas/menu-layout.js";
import { drawRoundEnd } from "../../../kit/src/canvas/round-end.js";
import { drawCard, drawPresent } from "../../../kit/src/canvas/screens.js";
import { kindOf } from "../../../kit/src/progress/index.js";
import { drawPlay, mateOf, rimmed } from "./board.js";
import { drawConfetti } from "./effects-art.js";
import { drawHero } from "./hero-art.js";
import { drawLookArt } from "./home-art.js";
import { drawJar } from "./jar-art.js";
import { PROGRESS } from "./levels.js";

const progressOf = (moment, time) => Math.min(1, Math.max(0, (time * 1000 - moment.start) / moment.duration));

function resultOf({ outcome }) {
  return { stars: outcome.stars, score: outcome.score, best: outcome.best, newBest: outcome.newBest, players: null, gift: outcome.gift ? { look: outcome.gift, opened: outcome.opened } : null };
}

function picture(ctx, area, state, theme, time) {
  const size = Math.min(area.h * 0.92, area.w / 3.4);
  const x = area.x + area.w / 2;
  const y = area.y + area.h * 0.5;
  const mate = state.outcome.team ? mateOf(state) : null;
  rimmed(ctx, theme, () => {
    drawJar(ctx, x, y + size * 0.08, size * 0.8, 1, theme, time);
    drawHero(ctx, { x: x - size * 1.05, y, size }, { player: state.player, mallet: state.progress.chosen.mallet, pose: "celebrate", time }, theme);
    if (mate) drawHero(ctx, { x: x + size * 1.05, y, size }, { ...mate, pose: "celebrate", flip: true, time: time + 0.3 }, theme);
  });
}

function present(ctx, area, { look, opened, time }, theme) {
  if (!opened) {
    rimmed(ctx, theme, () => drawPresent(ctx, { x: area.x + 14, y: area.y + 10, w: area.w - 28, h: area.h - 20 }, (time % 2) / 2, theme.art.present));
    return;
  }
  drawCard(ctx, area, theme.ui, { chosen: true });
  drawLookArt(ctx, { x: area.x + 6, y: area.y + 6, w: area.w - 12, h: area.h - 12 }, kindOf(PROGRESS.spec.gifts, look), look, theme);
}

export function drawEnd(ctx, state, theme, time) {
  const { width, height, fill } = state;
  ctx.save();
  if (state.round && state.layout) drawPlay(ctx, { ...state, paused: false, hint: null, press: null, sound: { ...state.sound, open: false } }, theme, time);
  const layout = endLayout(width, height, { gift: true, fill });
  drawRoundEnd(ctx, state, theme.ui, time, {
    layout,
    result: resultOf(state),
    volume: state.layout?.volume,
    drawPicture: (pen, area, now) => picture(pen, area, state, theme, now),
    drawGift: (pen, area, gift) => present(pen, area, gift, theme),
  });
  for (const moment of state.moments) if (moment.kind === "confetti") drawConfetti(ctx, layout.card, progressOf(moment, time), 5, theme);
  ctx.restore();
}
