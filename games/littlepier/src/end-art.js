import { drawPortrait } from "../../../kit/src/canvas/bar.js";
import { endLayout, promptLayout } from "../../../kit/src/canvas/menu-layout.js";
import { drawRoundEnd } from "../../../kit/src/canvas/round-end.js";
import { drawCard, drawPrompt as drawPromptCard } from "../../../kit/src/canvas/screens.js";
import { kindOf } from "../../../kit/src/progress/index.js";
import { drawAngler } from "./angler.js";
import { drawPlay, rimmed } from "./board.js";
import { drawBucket } from "./gear.js";
import { drawLookArt, drawWrapped } from "./home-art.js";
import { PROGRESS } from "./levels.js";

function resultOf({ outcome }) {
  return {
    stars: outcome.stars,
    score: outcome.score,
    best: outcome.best,
    newBest: outcome.newBest,
    players: null,
    gift: outcome.gift ? { look: outcome.gift, opened: outcome.opened } : null,
  };
}

function picture(ctx, area, state, rival, theme, time) {
  const size = Math.min(area.h * 0.82, area.w / 4.2);
  const seatY = area.y + area.h * 0.62;
  const left = area.x + area.w / 2 - size * 1.35;
  const right = area.x + area.w / 2 + size * 1.35;
  rimmed(ctx, theme, () => {
    drawBucket(ctx, area.x + area.w / 2, seatY - size * 0.25, size * 0.7, theme, { time });
    drawAngler(ctx, left, seatY, size, { player: state.player, pose: "cheering", time }, theme);
    if (rival?.kind === "flick") drawAngler(ctx, right, seatY, size, { player: { who: "flick" }, pose: "cheering", time: time + 0.3, flip: true }, theme);
  });
  if (rival?.kind === "friend") {
    const face = Math.min(56, area.h - 28);
    drawPortrait(ctx, right, area.y + face / 2 + 2, face, { player: rival.player, score: rival.score, thinking: rival.thinking, face: "happy" }, theme.ui, { time, lang: state.lang, score: "below" });
  }
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
  if (state.round && state.layout) drawPlay(ctx, { ...state, paused: false, hint: false, moments: [], press: null, holding: false, cast: 0, flickHolding: false, sound: { ...state.sound, open: false } }, theme, time);
  drawRoundEnd(ctx, state, theme.ui, time, {
    layout: endLayout(width, height, { gift: true, fill: state.fill }),
    result: resultOf(state),
    volume: state.layout?.volume,
    drawPicture: (pen, area, now) => picture(pen, area, state, rival, theme, now),
    drawGift: (pen, area, gift) => present(pen, area, gift, theme),
  });
  ctx.restore();
}

export function drawPrompt(ctx, state, player, theme, time) {
  const { width, height, fill } = state;
  drawPromptCard(ctx, state, theme.ui, time, { layout: promptLayout(width, height, { fill }), player });
}
