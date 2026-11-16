import { drawHintHand, drawPause, drawStar, drawTopBar, pauseLayout } from "../../../kit/src/canvas/index.js";
import { clamp, fadeEdges, withRim } from "../../../kit/src/canvas/pen.js";
import { drawDottedPath, drawFlight, drawPaintStain, drawSlingshot, drawSplash, drawWaterSplash, drawWaterStain } from "./effects.js";
import { drawDial, drawDiveButton, drawFireButton, drawTurnMarker, drawWindFlag } from "./hud.js";
import { WATER_STAIN_MS } from "./impact.js";
import { toScreen, toWorld, visibleWorld } from "./layout.js";
import { drawScene, waveAt } from "./scene.js";
import { drawShip } from "./ships.js";
import { DIVE_DROP, drawSub } from "./subs.js";
import { drawTank } from "./tanks.js";
import { drawTarget } from "./targets.js";
import { DIVED_Y, WORLD, seaOf, vehicleAt } from "./world.js";

const DRAW = { tank: drawTank, ship: drawShip, sub: drawSub };
const radians = (degrees) => (degrees * Math.PI) / 180;

export const progressOf = (moment, now) => clamp((now - moment.start) / moment.duration);
const active = (moments, kind, now, test = () => true) => moments.find((one) => one.kind === kind && now >= one.start && now < one.start + one.duration && test(one));

export const paintOf = (art, team) => (team === 0 ? art.player : art.rival);

export function applyView(ctx, view) {
  ctx.translate(view.x + (view.mirror ? WORLD.width * view.scale : 0), view.y);
  ctx.scale(view.mirror ? -view.scale : view.scale, view.scale);
}

function subState(scene, side, now) {
  const dive = active(scene.moments, "dive", now, (one) => one.side === side);
  if (dive) return { state: dive.under ? "diving" : "surfacing", progress: progressOf(dive, now) };
  const firing = scene.flight?.side === side && scene.flight.torpedo;
  if (scene.world.under[side]) return { state: firing ? "torpedo" : "underwater", progress: 0 };
  return { state: "idle", progress: 0 };
}

function barrelOf(scene, side) {
  if (side === scene.mySide && scene.aim) return radians(scene.aim.angle);
  return radians(scene.lastAngle[side] ?? 32);
}

function drawVehicle(ctx, scene, side, art, now) {
  const vehicle = vehicleAt(scene.world, side);
  const team = side === scene.mySide ? 0 : 1;
  const recoil = active(scene.moments, "recoil", now, (one) => one.side === side);
  const wiping = Boolean(active(scene.moments, "wipe", now, (one) => one.side === side));
  const time = now / 1000;
  const options = {
    variant: scene.looks[side], team, direction: side === 0 ? 1 : -1, angle: barrelOf(scene, side), time,
    recoil: recoil ? 1 - progressOf(recoil, now) : 0, hitLevel: scene.shown?.paint[side] ?? 0, wiping, hitColour: paintOf(art, 1 - team),
  };
  if (vehicle.family === "ship") options.wave = waveAt(vehicle.x, time) * 0.6;
  let y = vehicle.y;
  if (vehicle.family === "sub") {
    const look = subState(scene, side, now);
    Object.assign(options, look);
    const dive = look.state === "diving" ? look.progress : look.state === "surfacing" ? 1 - look.progress : vehicle.under ? 1 : 0;
    const sea = seaOf(scene.world.field);
    y = sea + (DIVED_Y - sea) * dive - dive * vehicle.size * DIVE_DROP;
  }
  DRAW[vehicle.family](ctx, vehicle.x, y, vehicle.size, art, options);
  return vehicle;
}

function drawMarks(ctx, scene, art, now) {
  for (const stain of scene.stains) {
    const colour = paintOf(art, stain.team);
    if (stain.water) drawWaterStain(ctx, stain.x, stain.y, stain.size, colour, art, (now - stain.at) / WATER_STAIN_MS, stain.seed);
    else drawPaintStain(ctx, stain.x, stain.y, stain.size, colour, art, stain.seed);
  }
  scene.paths.forEach((path, side) => path && drawDottedPath(ctx, path, paintOf(art, side === scene.mySide ? 0 : 1), art, { faint: true, dot: 3 }));
}

function drawTargets(ctx, scene, art, now) {
  scene.targets.forEach((one, index) => {
    const moment = active(scene.moments, "target", now, (item) => item.index === index);
    const hit = moment ? progressOf(moment, now) : one.hit ? 1 : 0;
    drawTarget(ctx, one.x, one.y, one.size, one.kind, art, { hit, time: now / 1000, colour: paintOf(art, scene.hitBy?.[index] ?? 0) });
  });
}

function drawShots(ctx, scene, art, now) {
  const { flight } = scene;
  if (flight && now >= flight.start + flight.delay) {
    const progress = (now - flight.start - flight.delay) / flight.duration;
    drawFlight(ctx, { points: flight.path, progress, ball: scene.balls[flight.side], colour: paintOf(art, flight.side === scene.mySide ? 0 : 1), torpedo: flight.torpedo, sea: seaOf(scene.world.field) }, art, now / 1000);
  }
  for (const moment of scene.moments.filter((one) => one.kind === "splash")) {
    const draw = moment.water ? drawWaterSplash : drawSplash;
    draw(ctx, moment.x, moment.y, moment.size, progressOf(moment, now), paintOf(art, moment.team), art, moment.seed);
  }
}

function drawAim(ctx, scene, art) {
  if (!scene.preview) return;
  const colour = paintOf(art, 0);
  const { pull, anchor, view } = scene;
  if (pull && !pull.short) {
    const [x, y] = toWorld(view, pull.x, pull.y);
    drawSlingshot(ctx, { from: [anchor.x, anchor.y], pull: [x, y], points: scene.preview, colour, ball: scene.balls[scene.mySide] }, art);
  } else drawDottedPath(ctx, scene.preview, colour, art, { dot: 3.5 });
}

function drawWorld(ctx, scene, theme, now) {
  const { art, ui } = theme;
  const { width, height } = scene;
  const time = now / 1000;
  drawScene(ctx, scene.world, { scenery: scene.scenery, ...visibleWorld(scene.view, width, height), time, wind: scene.wind }, art);
  withRim(ctx, { ink: art.ink, colour: art.rim }, () => {
    drawMarks(ctx, scene, art, now);
    drawTargets(ctx, scene, art, now);
    const vehicles = scene.sides.map((side) => drawVehicle(ctx, scene, side, art, now));
    drawShots(ctx, scene, art, now);
    drawAim(ctx, scene, art);
    const turn = vehicles.find((one) => one.side === scene.turnSide);
    if (turn) drawTurnMarker(ctx, turn.x, turn.y - turn.size * (turn.under ? 0.2 : 1.15), 34, turn.side === scene.mySide ? 0 : 1, time, ui);
  });
  drawWindFlag(ctx, WORLD.width / 2, WORLD.height * 0.2, 48, scene.wind, time, ui);
}

function drawStarFlights(ctx, scene, ui, now) {
  const { layout } = scene;
  const to = { me: [layout.bar.x + 24, layout.bar.y + layout.row / 2], rival: layout.rival ? [layout.rival.x, layout.rival.y] : [layout.bar.x + 24, layout.bar.y + 24] };
  for (const moment of scene.moments.filter((one) => one.kind === "star" && now >= one.start)) {
    const p = progressOf(moment, now);
    const [fromX, fromY] = toScreen(scene.view, moment.x, moment.y);
    const [endX, endY] = to[moment.to];
    drawStar(ctx, fromX + (endX - fromX) * p, fromY + (endY - fromY) * p - Math.sin(p * Math.PI) * 42, 26 - p * 8, true, ui);
  }
}

function drawControls(ctx, scene, ui, time) {
  const { layout, press, aim } = scene;
  const pressed = (kind) => press?.kind === kind;
  if (!scene.sound.open && aim) {
    drawDial(ctx, layout.angle, aim.angle, scene.torpedo ? "torpedo" : "angle", ui, { pressed: pressed("angle"), lang: scene.lang });
    drawDial(ctx, layout.power, aim.power, "power", ui, { pressed: pressed("power"), lang: scene.lang });
  }
  if (scene.sub) drawDiveButton(ctx, layout.dive, ui, { under: scene.torpedo, pressed: pressed("dive"), time });
  drawFireButton(ctx, layout.fire, ui, { pressed: pressed("fire"), waiting: !scene.myTurn });
}

function drawHint(ctx, scene, ui, time) {
  if (!scene.hint || scene.pull) return;
  const [x, y] = toScreen(scene.view, scene.anchor.x, scene.anchor.y);
  const swing = Math.sin(((time % 1.8) / 1.8) * Math.PI);
  const reach = 70 * scene.view.scale;
  drawHintHand(ctx, x - reach * swing, y + reach * 0.8 * swing + 20, 64, (time % 1.8) / 1.8, ui);
}

export function drawPlay(ctx, scene, theme, time) {
  const { ui, art } = theme;
  const now = time * 1000;
  const { width, height } = scene;
  ctx.save();
  ctx.fillStyle = art.scenery[scene.scenery].sky;
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  applyView(ctx, scene.view);
  drawWorld(ctx, scene, theme, now);
  ctx.restore();
  fadeEdges(ctx, width, height, ui.page);
  drawTopBar(ctx, scene.layout, scene.bar, ui, time);
  drawControls(ctx, scene, ui, time);
  drawStarFlights(ctx, scene, ui, now);
  drawHint(ctx, scene, ui, time);
  if (scene.paused) drawPause(ctx, { width, height, press: scene.press }, ui, { layout: pauseLayout(width, height, { fill: scene.fill }) });
  ctx.restore();
}

