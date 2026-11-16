import { centreOf } from "../../../kit/src/canvas/layout.js";
import { homeLayout, looksLayout } from "../../../kit/src/canvas/menu-layout.js";
import { clamp } from "../../../kit/src/canvas/pen.js";
import { drawHome as drawHomeScreen, drawLooks as drawLooksScreen, drawPresent } from "../../../kit/src/canvas/screens.js";
import { drawTip } from "./archer.js";
import { drawBalloon } from "./balloons.js";
import { rimmed } from "./board.js";
import { drawRulerPicture } from "./card-art.js";
import { balloonAt, stageLayout } from "./layout.js";
import { LOOKS, PROGRESS, RULERS } from "./levels.js";
import { TABS } from "./menus.js";
import { drawRuler } from "./ruler-art.js";
import { drawScenery } from "./scenery.js";

const SHOWN = Object.freeze([{ share: 0.2, size: 1, lift: 0.3, colour: 0 }, { share: 0.52, size: 2, lift: 1, colour: 1 }, { share: 0.8, size: 0, lift: 0.55, colour: 2 }]);
const RANGES = Object.freeze({ short: 10, medium: 100, long: 1000 });

export function drawScene(ctx, area, { place = "meadow", ruler = "short", lang = "en" }, theme, time) {
  if (area.w < 40 || area.h < 30) return;
  const layout = stageLayout(area);
  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.w, area.h);
  ctx.clip();
  rimmed(ctx, theme, () => {
    drawScenery(ctx, area, place, theme, time, { ground: layout.ruler.y + layout.ruler.h * 0.6 });
    if (area.h < 70) return;
    if (layout.zone.bottom - layout.zone.top >= 60) {
      for (const one of SHOWN) {
        const at = balloonAt(layout, one);
        drawBalloon(ctx, at.x, at.y, at.size, { colour: one.colour, time, string: layout.ruler.y - at.y - at.size * 0.69 }, theme);
      }
    }
    if (layout.ruler.h >= 44) drawRuler(ctx, layout.ruler, { range: RANGES[ruler] ?? 10, lang }, theme);
    else drawRuler(ctx, { ...layout.ruler, y: layout.ruler.y + layout.ruler.h - 44, h: 44 }, { range: RANGES[ruler] ?? 10, lang }, theme);
  });
  ctx.restore();
}

const inset = (area, by) => ({ x: area.x + by, y: area.y + by, w: area.w - 2 * by, h: area.h - 2 * by });

export function drawHome(ctx, state, seat, theme, time) {
  const { width, height, fill } = state;
  drawHomeScreen(ctx, { ...state, variant: state.ruler }, theme.ui, time, {
    layout: homeLayout(width, height, { variants: RULERS, rival: Boolean(seat), fill }),
    seat,
    volume: state.layout?.volume,
    drawStage: (pen, band) => drawScene(pen, band, { place: state.progress.chosen.place, ruler: state.ruler, lang: state.lang }, theme, time),
    drawVariant: (pen, target) => drawRulerPicture(pen, inset(target, 10), target.value, theme),
  });
}

export function drawLookArt(ctx, area, kind, look, theme, time) {
  if (kind === "place") {
    const view = inset(area, 10);
    drawScenery(ctx, view, look, theme, time, { ground: view.y + view.h * 0.7 });
    return;
  }
  const [x, y] = centreOf(area);
  rimmed(ctx, theme, () => drawTip(ctx, x, y, clamp(area.w * 0.5, 30, 72), look, theme, -Math.PI / 2));
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
    drawTab: (pen, area, value) => drawLookArt(pen, area, value, LOOKS[value][0], theme, time),
    drawWrapped: (pen, area, shake) => drawWrapped(pen, area, shake, theme),
  });
}

