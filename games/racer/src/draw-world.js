import { LANE_COUNT, PLAYER_SCREEN_POSITION, ROAD_HALF_WIDTH, SIZES } from './tuning.js';
import { sceneryFor } from './scenery.js';
import { activeMoments } from './moments.js';
import {
  drawRoad, drawSpeedStreaks, drawFinishLine, drawHalfwayBand, drawFinishArch, drawCone, drawTippingCone, drawPuddle, drawSplash,
  drawBumpBurst, drawTrafficCar, drawRobotCar, drawPlayerVehicle, drawExhaustPuffs,
} from './art.js';

const STREAKS_FROM = 0.02;
const ARCH_DEPTH = 0.43;
const ARCH_OVERHANG = 0.6;
const PUFF_LENGTH = 90;
const DEFAULT_VEHICLE = { kind: 'car', color: 'sunshine' };

export function onStage(ctx, view, zoom) {
  ctx.setTransform(view.dpr * zoom, 0, 0, view.dpr * zoom, view.offsetX * view.dpr, 0);
}

function worldFrame(view, game) {
  const frame = {
    width: view.width / view.zoom,
    height: view.height / view.zoom,
    anchorY: (view.height * PLAYER_SCREEN_POSITION) / view.zoom,
    scale: view.scale,
    night: sceneryFor(game.level) === 'night',
    time: game.time,
  };
  frame.at = (thing) => ({
    x: frame.width / 2 + thing.x * frame.scale,
    y: frame.anchorY - (thing.distance - game.player.distance) * frame.scale,
  });
  frame.shows = ({ y }) => y > -3 * frame.scale && y < frame.height + 3 * frame.scale;
  return frame;
}

export function drawWorld(ctx, view, game, vehicle = DEFAULT_VEHICLE, rival = null) {
  const frame = worldFrame(view, game);
  const moments = activeMoments(game);
  onStage(ctx, view, view.zoom);
  drawRoadArea(ctx, view, game, frame);
  drawHalfway(ctx, frame, game);
  const arch = drawFinish(ctx, frame, game);
  drawHazards(ctx, frame, game, moments);
  for (const car of game.track.traffic) {
    const spot = frame.at(car);
    if (!frame.shows(spot)) continue;
    drawTrafficCar(ctx, spot.x, spot.y, car.width * frame.scale, car.length * frame.scale, { variant: car.variant, steer: car.steer ?? 0, headlights: frame.night });
  }
  const racing = game.state === 'racing';
  if (game.robot) drawRacer(ctx, frame, drawRobotCar, game.robot, { braking: false, exhaust: racing });
  else if (rival) drawFriend(ctx, frame, rival);
  const drawPlayer = (context, x, y, width, length, options) => drawPlayerVehicle(context, x, y, width, length, { ...options, kind: vehicle.kind, color: vehicle.color });
  drawRacer(ctx, frame, drawPlayer, game.player, { braking: Boolean(game.player.braking), exhaust: racing && game.player.pressing });
  for (const bump of moments.filter((moment) => moment.kind === 'bump')) {
    const spot = frame.at(bump.thing);
    drawBumpBurst(ctx, spot.x, spot.y, { progress: bump.progress, size: bump.thing.length * frame.scale * 0.8 });
  }
  if (arch) drawFinishArch(ctx, arch.x, arch.y, arch.width, { time: frame.time });
}

function drawRoadArea(ctx, view, game, frame) {
  const roadWidth = ROAD_HALF_WIDTH * 2 * frame.scale;
  const area = { width: view.width, height: frame.height, roadLeft: (view.width - roadWidth) / 2, roadWidth };
  ctx.save();
  ctx.translate((frame.width - view.width) / 2, 0);
  drawRoad(ctx, { ...area, lanes: LANE_COUNT, scroll: game.player.distance * frame.scale + frame.anchorY, scenery: sceneryFor(game.level) });
  if (game.streaks > STREAKS_FROM) drawSpeedStreaks(ctx, { ...area, time: frame.time, speed: game.streaks });
  ctx.restore();
}

function drawHalfway(ctx, frame, game) {
  if (game.track.halfway === null) return;
  const roadWidth = ROAD_HALF_WIDTH * 2 * frame.scale;
  const spot = frame.at({ x: 0, distance: game.track.halfway });
  if (frame.shows(spot)) drawHalfwayBand(ctx, spot.x - roadWidth / 2, spot.y, roadWidth);
}

function drawFinish(ctx, frame, game) {
  const roadWidth = ROAD_HALF_WIDTH * 2 * frame.scale;
  const archWidth = roadWidth + ARCH_OVERHANG * frame.scale;
  const spot = frame.at({ x: 0, distance: game.track.length });
  const lineY = spot.y - roadWidth / 12;
  if (lineY < -roadWidth / 6 || lineY - archWidth * ARCH_DEPTH > frame.height) return null;
  drawFinishLine(ctx, spot.x - roadWidth / 2, lineY, roadWidth);
  return { x: spot.x - archWidth / 2, y: lineY - archWidth * ARCH_DEPTH, width: archWidth };
}

function drawHazards(ctx, frame, game, moments) {
  const tipping = new Map(moments.filter((moment) => moment.kind === 'tip').map((moment) => [moment.thing, moment.progress]));
  for (const hazard of game.track.hazards) {
    const spot = frame.at(hazard);
    if (!frame.shows(spot)) continue;
    const size = hazard.width * frame.scale;
    if (hazard.kind === 'puddle') drawPuddle(ctx, spot.x, spot.y, size, hazard.length * frame.scale, { time: frame.time });
    else if (tipping.has(hazard)) drawTippingCone(ctx, spot.x, spot.y, size, { progress: tipping.get(hazard) });
    else drawCone(ctx, spot.x, spot.y, size);
  }
  for (const splash of moments.filter((moment) => moment.kind === 'splash')) {
    const spot = frame.at(splash);
    drawSplash(ctx, spot.x, spot.y, { progress: splash.progress, size: 1.9 * frame.scale });
  }
}

function drawFriend(ctx, frame, rival) {
  const spot = frame.at(rival);
  if (!frame.shows(spot)) return;
  const { width, length } = SIZES.player;
  drawPlayerVehicle(ctx, spot.x, spot.y, width * frame.scale, length * frame.scale, {
    kind: rival.kind, color: rival.color, braking: rival.braking, headlights: frame.night, time: frame.time,
  });
}

function drawRacer(ctx, frame, draw, car, { braking, exhaust }) {
  const spot = frame.at(car);
  const length = car.length * frame.scale;
  if (exhaust) drawExhaustPuffs(ctx, spot.x, spot.y + length / 2, { time: frame.time, scale: length / PUFF_LENGTH });
  const bumped = car.bumpTimer > 0;
  const wobble = bumped ? Math.sin(frame.time * 40) * 0.8 : 0;
  draw(ctx, spot.x, spot.y, car.width * frame.scale, length, { steer: car.steer + wobble, bumped, time: frame.time, braking, headlights: frame.night });
}
