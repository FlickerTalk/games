import { HALFWAY_FROM_SECONDS, LANE_COUNT, RACE, ROAD_HALF_WIDTH, SIZES } from './tuning.js';

export const LANE_WIDTH = (ROAD_HALF_WIDTH * 2) / LANE_COUNT;
export const laneCenters = Array.from({ length: LANE_COUNT }, (_, lane) => (lane - (LANE_COUNT - 1) / 2) * LANE_WIDTH);

const BUS = 3;
const TRAFFIC_VARIANTS = [0, 1, 2, BUS];

export function clampToRoad(x, halfWidth) {
  const limit = ROAD_HALF_WIDTH - halfWidth;
  return Math.min(limit, Math.max(-limit, x));
}

export function buildTrack(settings, random) {
  const length = settings.trackLength;
  const hazards = spread(Math.floor(settings.hazardCount), length - 15, random)
    .map((distance) => placeHazard(distance, random));
  const traffic = spread(Math.floor(settings.trafficCount), length * 0.8, random)
    .map((distance) => placeTraffic(distance, settings, random));
  const halfway = settings.raceSeconds >= HALFWAY_FROM_SECONDS ? length / 2 : null;
  return { length, hazards, traffic, halfway };
}

function spread(count, end, random) {
  const start = RACE.startClearDistance;
  const slot = (end - start) / Math.max(count, 1);
  return Array.from({ length: count }, (_, index) => start + slot * (index + random.range(0.2, 0.8)));
}

function placeHazard(distance, random) {
  const kind = random.chance(0.3) ? 'puddle' : 'cone';
  const size = SIZES[kind];
  const x = clampToRoad(random.pick(laneCenters) + random.range(-0.3, 0.3), size.width / 2);
  return { kind, x, distance, ...size, knocked: false };
}

function placeTraffic(distance, settings, random) {
  const variant = random.pick(TRAFFIC_VARIANTS);
  const size = variant === BUS ? SIZES.bus : SIZES.traffic;
  return {
    kind: 'traffic',
    variant,
    x: clampToRoad(random.pick(laneCenters) + random.range(-0.3, 0.3), size.width / 2),
    distance,
    ...size,
    speed: settings.topSpeed * RACE.trafficSpeedFactor,
    bumpTimer: 0,
  };
}
