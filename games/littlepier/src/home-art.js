import { drawHome as drawHomeScreen, drawLooks as drawLooksScreen, drawPresent } from "../../../kit/src/canvas/screens.js";
import { homeLayout, looksLayout } from "../../../kit/src/canvas/menu-layout.js";
import { centreOf } from "../../../kit/src/canvas/layout.js";
import { clamp } from "../../../kit/src/canvas/pen.js";
import { drawAlbumBadge } from "./album-art.js";
import { drawAnglers, drawBackdrop, drawPlace, rimmed } from "./board.js";
import { drawBucket, drawCharm } from "./gear.js";
import { HOME_TILES, TABS, sceneLayout } from "./layout.js";
import { LOOKS, PROGRESS } from "./levels.js";

const SMALLEST_ANGLER = 30;

export function drawScene(ctx, area, { day = "morning", place = "pier", anglers = [] }, theme, time) {
  if (area.w < 80 || area.h < 50) return;
  const frame = sceneLayout(area);
  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.w, area.h);
  ctx.clip();
  rimmed(ctx, theme, () => {
    drawBackdrop(ctx, frame, { day, share: 0.2 }, theme, time);
    const seatY = drawPlace(ctx, frame, place, theme, time);
    if (frame.size < SMALLEST_ANGLER) return;
    drawBucket(ctx, frame.bucket.x, seatY - frame.bucket.size * 0.42, frame.bucket.size, theme, { time });
    drawAnglers(ctx, frame, seatY, anglers, theme, time);
  });
  ctx.restore();
}

const inset = (area, by) => ({ x: area.x + by, y: area.y + by, w: area.w - 2 * by, h: area.h - 2 * by });

export function drawHome(ctx, state, seat, theme, time) {
  const { width, height, fill, mode } = state;
  const anglers = [{ player: state.player, pose: "idle" }, ...(mode === "flick" ? [{ player: { who: "flick" }, pose: "idle" }] : [])];
  drawHomeScreen(ctx, state, theme.ui, time, {
    layout: homeLayout(width, height, { variants: HOME_TILES, rival: Boolean(seat), fill }),
    seat,
    volume: state.layout?.volume,
    drawStage: (pen, band) => drawScene(pen, band, { day: state.day, place: state.progress.chosen.place, anglers }, theme, time),
    drawVariant: (pen, target) => drawAlbumBadge(pen, inset(target, 16), state.album.length, theme, time, state.lang),
  });
}

export function drawLookArt(ctx, area, kind, look, theme, time) {
  if (kind === "place") {
    drawScene(ctx, inset(area, 8), { place: look }, theme, time);
    return;
  }
  const [x, y] = centreOf(area);
  rimmed(ctx, theme, () => drawCharm(ctx, x, y, clamp(area.w * 0.42, 24, 72), look, theme, time));
}

function shakeOf(state, index, time) {
  const moment = state.moments.find((one) => one.kind === "shake" && one.index === index);
  return moment ? clamp((time * 1000 - moment.start) / moment.duration, 0, 1) : 0;
}

export const drawWrapped = (ctx, area, shake, theme) => rimmed(ctx, theme, () => drawPresent(ctx, area, shake, theme.art.present));

export function drawLooks(ctx, state, theme, time) {
  const { width, height } = state;
  const kind = state.looks;
  const looks = LOOKS[kind];
  drawLooksScreen(ctx, state, theme.ui, time, {
    layout: looksLayout(width, height, { kind, count: looks.length, fill: state.fill, tabs: [...TABS] }),
    kind,
    looks,
    owned: PROGRESS.owned(state.progress),
    chosen: state.progress.chosen[kind],
    shake: (index) => shakeOf(state, index, time),
    drawLook: (pen, area, look, now) => drawLookArt(pen, area, kind, look, theme, now),
    drawTab: (pen, area, value) => drawLookArt(pen, area, value, value === "place" ? "pier" : "star", theme, time),
    drawWrapped: (pen, area, shake) => drawWrapped(pen, area, shake, theme),
  });
}
