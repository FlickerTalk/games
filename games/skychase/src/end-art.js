import { drawAvatar, standIn } from "../../../kit/src/avatars/index.js";
import { drawCard, drawPresent, drawRoundEnd, endLayout } from "../../../kit/src/canvas/index.js";
import { clamp } from "../../../kit/src/canvas/pen.js";
import { drawAircraft } from "./aircraft.js";
import { drawPlay } from "./board.js";
import { drawConfetti } from "./effects.js";
import { drawLookArt } from "./home-art.js";

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
  const size = Math.min(area.w * 0.5, area.h * 0.8, 130);
  if (size < 44) return;
  const { outcome, player } = state;
  const mine = outcome.looks[state.round?.seat ?? 0];
  const face = outcome.won ? "cheering" : "happy";
  drawAircraft(ctx, mine.craft, area.x + area.w / 2, area.y + area.h / 2 + Math.sin(time * 2) * 3, size, theme, {
    colour: mine.colour, time, balloons: 0, pose: outcome.won ? "speed" : "idle",
    pilot: (pen, x, y, width) => drawAvatar(pen, x, y, width, { ...player, face, time }),
  });
}

function present(ctx, area, { look, opened }, state, theme, time) {
  if (!opened) {
    drawPresent(ctx, area, 0, theme.art.gift);
    return;
  }
  drawCard(ctx, area, theme.ui, { chosen: true });
  drawLookArt(ctx, area, look, theme, time, state.colour);
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
    drawGift: (pen, area, gift) => present(pen, area, gift, state, theme, time),
  });
  for (const moment of state.moments) {
    if (moment.kind === "confetti") drawConfetti(ctx, layout.card, clamp((time * 1000 - moment.start) / moment.duration), theme);
  }
}
