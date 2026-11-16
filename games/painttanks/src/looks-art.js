import { centreOf, drawLooks as drawLooksScreen, drawPresent, looksLayout } from "../../../kit/src/canvas/index.js";
import { clamp, withRim } from "../../../kit/src/canvas/pen.js";
import { kindOf } from "../../../kit/src/progress/index.js";
import { drawPaintBall } from "./effects.js";
import { LOOKS, PROGRESS } from "./levels.js";
import { drawShip } from "./ships.js";
import { drawSub } from "./subs.js";
import { drawTank } from "./tanks.js";

const KINDS = Object.keys(LOOKS);
const VEHICLES = { tank: [drawTank, 0.32], ship: [drawShip, 0.2], sub: [drawSub, 0.04] };

export function drawLookArt(ctx, area, kind, look, theme, time) {
  const { art } = theme;
  const family = kind ?? kindOf(PROGRESS.spec.gifts, look);
  const [x, y] = centreOf(area);
  const size = Math.min(area.w, area.h);
  withRim(ctx, { ink: art.ink, colour: art.rim }, () => {
    if (family === "ball") drawPaintBall(ctx, x, y, size * 0.2, look, art.player, art, time);
    else {
      const [draw, drop] = VEHICLES[family];
      draw(ctx, x, y + size * drop, size * 0.62, art, { variant: look, time });
    }
  });
}

function shakeOf(state, index, time) {
  const moment = state.moments.find((one) => one.kind === "shake" && one.index === index);
  return moment ? clamp((time * 1000 - moment.start) / moment.duration) : 0;
}

export function drawLooks(ctx, state, theme, time) {
  const { width, height, progress } = state;
  const kind = state.looks;
  const looks = kind ? LOOKS[kind] : KINDS;
  drawLooksScreen(ctx, state, theme.ui, time, {
    layout: looksLayout(width, height, { kind: kind ?? "kinds", count: looks.length, fill: state.fill }),
    kind: kind ?? "kinds",
    looks,
    owned: kind ? PROGRESS.owned(progress) : KINDS,
    chosen: kind ? progress.chosen[kind] : null,
    shake: (index) => shakeOf(state, index, time),
    drawLook: (pen, area, look, now) => drawLookArt(pen, area, kind, kind ? look : progress.chosen[look], theme, now),
    drawTab: () => {},
    drawWrapped: (pen, area, shake) => withRim(pen, { ink: theme.art.ink, colour: theme.art.rim }, () => drawPresent(pen, area, shake, theme.art.present)),
  });
}
