import { FLICK, standIn } from "../../../kit/src/avatars/index.js";
import { centreOf, drawHome as drawHomeScreen, drawLooks as drawLooksScreen, drawMark, drawPresent, homeLayout, looksLayout } from "../../../kit/src/canvas/index.js";
import { roundedRect } from "../../../kit/src/canvas/pen.js";
import { drawStage } from "./board.js";
import { drawDie } from "./dice-art.js";
import { LOOK_TABS, variantsOf } from "./game.js";
import { LOOKS, PROGRESS } from "./levels.js";
import { drawPiece } from "./pieces.js";
import { drawScenery } from "./scenery.js";
import { drawSquare } from "./track-art.js";

const STRIP = 4;

function bandTrack(ctx, band, state, theme, time) {
  if (band.h < 70) return;
  const cell = Math.min(band.h * 0.5, 64, (band.w - 32) / (STRIP * 1.14));
  const left = band.x + (band.w - cell * (STRIP * 1.14 - 0.14)) / 2 + cell / 2;
  const y = band.y + band.h / 2 + cell * 0.1;
  for (let at = 0; at < STRIP; at += 1) drawSquare(ctx, left + at * cell * 1.14, y, cell, at + 1, "plain", theme, { lang: state.lang });
  drawPiece(ctx, left, y - cell * 0.06, cell * 0.92, 0, state.player, theme, { face: "happy", time });
}

function variantArt(ctx, area, value, state, theme, time) {
  const [x, y] = centreOf(area);
  const size = Math.min(area.w, area.h) * 0.46;
  if (value === "flick") {
    drawPiece(ctx, x, y, size * 1.25, 1, { who: FLICK.id }, theme, { face: "confident", time });
    return;
  }
  drawPiece(ctx, x - size * 0.48, y, size, 0, state.player, theme, { face: "happy", time });
  drawPiece(ctx, x + size * 0.48, y, size, 1, standIn(state.player), theme, { face: "happy", time });
}

export function drawHome(ctx, state, seat, theme, time, { invited = false } = {}) {
  const layout = homeLayout(state.width, state.height, { variants: variantsOf(state), rival: Boolean(seat), fill: state.fill });
  drawHomeScreen(ctx, state, theme.ui, time, {
    layout,
    seat,
    volume: state.layout?.volume,
    drawStage: (pen, band) => {
      drawStage(pen, state, theme, time);
      bandTrack(pen, band, state, theme, time);
    },
    drawVariant: (pen, target) => variantArt(pen, target, target.value, state, theme, time),
  });
  const rival = layout.targets.find((one) => one.kind === "rival");
  if (invited && rival) drawMark(ctx, "play", rival.x + rival.w - 20, rival.y + rival.h - 20, 36, theme.ui);
}

export function drawLookArt(ctx, area, kind, look, state, theme, time) {
  const [x, y] = centreOf(area);
  const size = Math.min(area.w, area.h);
  if (kind === "dice") {
    drawDie(ctx, x, y, size * 0.5, 5, theme.art.dice[look] ?? theme.art.dice.cream, theme, { time });
    return;
  }
  ctx.save();
  roundedRect(ctx, area.x + 6, area.y + 6, area.w - 12, area.h - 12, theme.ui.radius - 4);
  ctx.clip();
  drawScenery(ctx, look, area, theme, time);
  ctx.restore();
  drawSquare(ctx, x, y, size * 0.36, LOOKS.track.indexOf(look) + 1, "plain", theme, { lang: state.lang });
}

function shakeOf(state, index, time) {
  const moment = state.moments.find((one) => one.kind === "shake" && one.index === index);
  return moment ? Math.min(1, Math.max(0, (time * 1000 - moment.start) / moment.duration)) : 0;
}

export function drawLooks(ctx, state, theme, time) {
  const kind = state.looks;
  const looks = LOOKS[kind];
  drawLooksScreen(ctx, state, theme.ui, time, {
    layout: looksLayout(state.width, state.height, { kind, count: looks.length, fill: state.fill, tabs: LOOK_TABS }),
    kind,
    looks,
    owned: PROGRESS.owned(state.progress),
    chosen: state.progress.chosen[kind],
    shake: (index) => shakeOf(state, index, time),
    drawLook: (pen, area, look, now) => drawLookArt(pen, area, kind, look, state, theme, now),
    drawTab: (pen, area, value) => drawLookArt(pen, { x: area.x + 8, y: area.y + 8, w: area.w - 16, h: area.h - 16 }, value, LOOKS[value][0], state, theme, 0),
    drawWrapped: (pen, area, shake) => drawPresent(pen, area, shake, theme.art.present),
  });
}
