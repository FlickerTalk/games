import { DIGITS, drawCard, drawDigits, drawRoundEnd, endLayout, formatNumber } from "../../../kit/src/canvas/index.js";
import { clamp, paint, roundedRect } from "../../../kit/src/canvas/pen.js";
import { drawPlay, mateOf } from "./board.js";
import { drawCraftWith, drawLookArt, drawWrapped } from "./home-art.js";

function resultOf(state) {
  const { outcome } = state;
  return { stars: outcome.stars, score: outcome.score, best: outcome.best, newBest: outcome.newBest, players: null, gift: outcome.gift ? { look: outcome.gift, opened: outcome.opened } : null };
}

function team(ctx, area, state, theme, time) {
  const { outcome, round } = state;
  const size = Math.min(area.w * 0.26, area.h - DIGITS.best - 8, 64);
  const y = area.y + size * 0.55;
  const parts = [[state.player, outcome.mine, round.seat], [mateOf(state), outcome.theirs, 1 - round.seat]];
  parts.forEach(([player, part, seat], side) => {
    const x = area.x + area.w / 2 + (side ? 1 : -1) * size * 0.9;
    drawCraftWith(ctx, x, y, size, { world: round.world, hull: round.hulls[seat], seat, player }, theme, time + side);
    drawDigits(ctx, formatNumber(part, state.lang), x, y + size * 0.55 + DIGITS.best * 0.6, DIGITS.best, theme.ui.text, "center");
  });
}

function present(ctx, area, { look, opened, time }, theme) {
  if (!opened) {
    drawWrapped(ctx, { x: area.x + 14, y: area.y + 10, w: area.w - 28, h: area.h - 20 }, (time % 2) / 2, theme);
    return;
  }
  drawCard(ctx, area, theme.ui, { chosen: true });
  drawLookArt(ctx, { x: area.x + 3, y: area.y + 3, w: area.w - 6, h: area.h - 6 }, look, theme, time);
}

function confetti(ctx, area, progress, theme) {
  const p = clamp(progress);
  const colours = theme.art.confetti;
  for (let at = 0; at < 24; at += 1) {
    ctx.save();
    ctx.translate(area.x + (((at * 47) % 101) / 100) * area.w, area.y + p * (90 + (at % 5) * 18) - Math.sin(p * Math.PI) * (30 + (at % 4) * 12));
    ctx.rotate(p * 5 + at);
    roundedRect(ctx, -3, -6, 6, 12, 2);
    paint(ctx, colours[at % colours.length]);
    ctx.restore();
  }
}

export function drawEnd(ctx, game, theme, time) {
  const { state } = game;
  const { width, height, outcome } = state;
  if (!state.round) return;
  if (state.layout) drawPlay(ctx, { ...game, state: { ...state, paused: false, moments: [], press: null, taught: ["steer", "free"], sound: { ...state.sound, open: false } } }, theme, time);
  const layout = endLayout(width, height, { gift: Boolean(outcome.gift), fill: state.fill });
  drawRoundEnd(ctx, state, theme.ui, time, {
    layout,
    result: resultOf(state),
    volume: state.layout?.volume,
    drawPicture: (pen, area, now) => team(pen, area, state, theme, now),
    drawGift: (pen, area, gift) => present(pen, area, gift, theme),
  });
  for (const moment of state.moments) {
    if (moment.kind === "confetti") confetti(ctx, layout.card, (time * 1000 - moment.start) / moment.duration, theme);
  }
}
