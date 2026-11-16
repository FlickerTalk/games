import { centreOf } from "../../../kit/src/canvas/layout.js";
import { homeLayout, looksLayout } from "../../../kit/src/canvas/menu-layout.js";
import { fadeEdges, roundedRect } from "../../../kit/src/canvas/pen.js";
import { drawHome as drawHomeScreen, drawLooks as drawLooksScreen, drawPresent } from "../../../kit/src/canvas/screens.js";
import { rimmed } from "./board.js";
import { drawGolem } from "./golem-art.js";
import { drawHero, drawMallet } from "./hero-art.js";
import { LOOKS, PROGRESS } from "./levels.js";
import { MALLET_REST } from "./motion.js";
import { drawPlace } from "./place-art.js";

const TABS = ["mallet", "place"];
const SHOWN = 12;

function band(ctx, area, state, theme, time) {
  const { place, mallet } = state.progress.chosen;
  const ground = area.y + area.h * 0.86;
  drawPlace(ctx, place, { x: 0, y: 0, w: state.width, h: state.height }, ground, theme);
  fadeEdges(ctx, state.width, state.height, theme.ui.page);
  if (area.h < 90) return;
  const size = Math.min(area.h * 0.62, 150, area.w * 0.3);
  const [x] = centreOf(area);
  rimmed(ctx, theme, () => {
    drawHero(ctx, { x: x - size * 0.55, y: ground - size * 0.52, size }, { player: state.player, mallet, angle: MALLET_REST + Math.sin(time * 2) * 0.05, time }, theme);
    drawGolem(ctx, x + size * 0.55, ground - size * 0.4, size * 0.8, { number: SHOWN, mood: "waiting", time }, theme);
  });
}

export function drawHome(ctx, state, seat, theme, time) {
  const layout = homeLayout(state.width, state.height, { variants: [], rival: Boolean(seat), fill: state.fill });
  drawHomeScreen(ctx, state, theme.ui, time, { layout, seat, volume: state.layout?.volume, drawStage: (pen, area) => band(pen, area, state, theme, time) });
}

export function drawLookArt(ctx, area, kind, look, theme) {
  const [x, y] = centreOf(area);
  if (kind === "mallet") {
    rimmed(ctx, theme, () => drawMallet(ctx, x - area.w * 0.12, y + area.h * 0.3, Math.min(area.w, area.h) * 0.74, { look, angle: 0.45 }, theme));
    return;
  }
  ctx.save();
  roundedRect(ctx, area.x + 6, area.y + 6, area.w - 12, area.h - 12, theme.ui.radius - 4);
  ctx.clip();
  drawPlace(ctx, look, { x: area.x + 6, y: area.y + 6, w: area.w - 12, h: area.h - 12 }, area.y + area.h * 0.78, theme);
  ctx.restore();
}

function shakeOf(state, index, time) {
  const moment = state.moments.find((one) => one.kind === "shake" && one.index === index);
  return moment ? Math.min(1, Math.max(0, (time * 1000 - moment.start) / moment.duration)) : 0;
}

export function drawLooks(ctx, state, theme, time) {
  const kind = state.looks;
  const looks = LOOKS[kind];
  drawLooksScreen(ctx, state, theme.ui, time, {
    layout: looksLayout(state.width, state.height, { kind, count: looks.length, fill: state.fill, tabs: TABS }),
    kind,
    looks,
    owned: PROGRESS.owned(state.progress),
    chosen: state.progress.chosen[kind],
    shake: (index) => shakeOf(state, index, time),
    drawLook: (pen, area, look) => drawLookArt(pen, area, kind, look, theme),
    drawTab: (pen, area, value) => drawLookArt(pen, { x: area.x + 8, y: area.y + 8, w: area.w - 16, h: area.h - 16 }, value, LOOKS[value][0], theme),
    drawWrapped: (pen, area, shake) => rimmed(pen, theme, () => drawPresent(pen, area, shake, theme.art.present)),
  });
}
