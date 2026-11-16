import { centreOf, drawCard, drawHome as drawHomeScreen, homeLayout } from "../../../kit/src/canvas/index.js";
import { roundedRect, withRim } from "../../../kit/src/canvas/pen.js";
import { drawPaintBall } from "./effects.js";
import { LOOKS } from "./levels.js";
import { drawScene } from "./scene.js";
import { drawShip } from "./ships.js";
import { drawSub } from "./subs.js";
import { drawTank } from "./tanks.js";
import { drawTarget } from "./targets.js";
import { FIELDS, SCENERIES, WORLD, familyOf, heightsFor, vehicleAt } from "./world.js";

const DRAW = { tank: drawTank, ship: drawShip, sub: drawSub };
const PICTURE_SEED = "AbCdEfGh";

export function drawMiniField(ctx, area, field, theme, time, { looks = {}, radius = theme.ui.radius - 4 } = {}) {
  const { art } = theme;
  const scenery = SCENERIES[FIELDS.indexOf(field) % SCENERIES.length];
  const world = { field, seed: PICTURE_SEED, heights: heightsFor(field, PICTURE_SEED), craters: [], under: [false, false] };
  const top = WORLD.height * 0.3;
  const scale = Math.max(area.w / WORLD.width, area.h / (WORLD.height - top));
  const left = area.x + (area.w - WORLD.width * scale) / 2;
  ctx.save();
  roundedRect(ctx, area.x, area.y, area.w, area.h, radius);
  ctx.clip();
  ctx.fillStyle = art.scenery[scenery].sky;
  ctx.fillRect(area.x, area.y, area.w, area.h);
  ctx.translate(left, area.y + area.h - WORLD.height * scale);
  ctx.scale(scale, scale);
  drawScene(ctx, world, { scenery, left: -left / scale, right: WORLD.width + left / scale, top, bottom: WORLD.height, time, wind: 0.4 }, art);
  withRim(ctx, { ink: art.ink, colour: art.rim }, () => {
    for (const side of [0, 1]) {
      const vehicle = vehicleAt(world, side);
      const family = familyOf(field, side);
      DRAW[family](ctx, vehicle.x, vehicle.y, vehicle.size, art, { variant: looks[family] ?? LOOKS[family][side], team: side, time, idle: false });
    }
  });
  ctx.restore();
}

function drawPracticeSeat(ctx, area, theme, time, pressed) {
  const { art, ui } = theme;
  drawCard(ctx, area, ui, { pressed });
  const [x, y] = centreOf(area);
  const size = Math.min(area.w, area.h);
  ctx.save();
  roundedRect(ctx, area.x + 6, area.y + 6, area.w - 12, area.h - 12, ui.radius - 4);
  ctx.clip();
  withRim(ctx, { ink: art.ink, colour: art.rim }, () => {
    drawTarget(ctx, x - size * 0.12, y + size * 0.05, size * 0.5, "blocks", art, { time });
    drawPaintBall(ctx, x + size * 0.22, y - size * 0.2, size * 0.1, "normal", art.player, art, time);
  });
  ctx.restore();
}

export function drawHome(ctx, state, seat, theme, time) {
  const { width, height, progress } = state;
  const layout = homeLayout(width, height, { variants: FIELDS, rival: state.mode !== "alone", fill: state.fill });
  drawHomeScreen(ctx, state, theme.ui, time, {
    layout,
    seat,
    volume: state.layout?.volume,
    drawStage: (pen, band) => band.h > 24 && drawMiniField(pen, band, state.variant, theme, time, { looks: progress.chosen, radius: 0 }),
    drawVariant: (pen, target) => drawMiniField(pen, { x: target.x + 8, y: target.y + 8, w: target.w - 16, h: target.h - 16 }, target.value, theme, time, { looks: progress.chosen }),
  });
  const rival = layout.targets.find((one) => one.kind === "rival");
  if (rival && !seat) drawPracticeSeat(ctx, rival, theme, time, state.press?.kind === "rival");
}
