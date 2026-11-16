import { FLICK, standIn } from "../../../kit/src/avatars/index.js";
import { drawCard, drawPresent, drawRoundEnd, endLayout } from "../../../kit/src/canvas/index.js";
import { clamp } from "../../../kit/src/canvas/pen.js";
import { kindOf } from "../../../kit/src/progress/index.js";
import { driverOf, drawRails, drawStage, horizonOf, rimmed } from "./board.js";
import { drawConfetti } from "./effects-art.js";
import { drawEngine } from "./engine-art.js";
import { drawLookArt } from "./home-art.js";
import { PROGRESS } from "./levels.js";

const SHARED = ["flick", "friend", "watch"];

function otherOf(state) {
  return state.outcome.kind === "flick" || state.round?.maker === "flick" ? { who: FLICK.id } : standIn(state.player);
}

function resultOf(state) {
  const { outcome } = state;
  const gift = outcome.gift ? { look: outcome.gift, opened: outcome.opened } : null;
  if (!SHARED.includes(outcome.kind)) return { stars: outcome.stars, score: outcome.level, best: null, newBest: false, gift };
  const both = [state.player, otherOf(state)].map((player) => ({ player, face: "cheering", thinking: false }));
  return { stars: outcome.stars, players: both, best: null, newBest: false, gift };
}

function picture(ctx, area, state, theme, time) {
  const size = Math.min(area.h * 0.8, area.w * 0.5, 110);
  const driver = driverOf(state);
  rimmed(ctx, theme, () => drawEngine(ctx, area.x + area.w / 2, area.y + area.h * 0.52, size, driver.look, { pose: "dancing", time, pilot: driver.pilot }, theme));
}

function present(ctx, area, { look, opened, time }, state, theme) {
  if (!opened) {
    rimmed(ctx, theme, () => drawPresent(ctx, { x: area.x + 12, y: area.y + 8, w: area.w - 24, h: area.h - 16 }, (time % 2) / 2, theme.art.present));
    return;
  }
  drawCard(ctx, area, theme.ui, { chosen: true });
  drawLookArt(ctx, { x: area.x + 6, y: area.y + 6, w: area.w - 12, h: area.h - 12 }, kindOf(PROGRESS.spec.gifts, look), look, state, theme, time);
}

export function drawEnd(ctx, state, theme, time) {
  const { width, height, fill } = state;
  ctx.save();
  if (state.layout) {
    drawStage(ctx, state, theme, horizonOf(state.layout.train));
    drawRails(ctx, state, state.layout.train, theme);
  }
  const layout = endLayout(width, height, { gift: true, fill });
  drawRoundEnd(ctx, state, theme.ui, time, {
    layout,
    result: resultOf(state),
    volume: state.layout?.volume,
    drawPicture: (pen, area, now) => picture(pen, area, state, theme, now),
    drawGift: (pen, area, gift) => present(pen, area, gift, state, theme),
  });
  for (const moment of state.moments) {
    if (moment.kind === "confetti") drawConfetti(ctx, layout.card, clamp((time * 1000 - moment.start) / moment.duration), 5, theme);
  }
  ctx.restore();
}
