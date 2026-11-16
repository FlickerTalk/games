import { drawPlayerCar } from './art-cars.js';
import { PALETTE } from './art-palette.js';
import { vehicleColor } from './art-vehicles-base.js';
import { drawIcecream, drawFiretruck, drawPolice } from './art-vehicles-service.js';
import { drawRacecar, drawRocket } from './art-vehicles-speed.js';
import { drawBus, drawKart, drawMotorbike, drawTractor, drawTruck } from './art-vehicles-street.js';

export const VEHICLE_KINDS = Object.freeze([
  'car',
  'motorbike',
  'kart',
  'truck',
  'bus',
  'tractor',
  'police',
  'firetruck',
  'racecar',
  'icecream',
  'rocket'
]);

const FIXED_TINTS = Object.freeze({ police: PALETTE.city, firetruck: PALETTE.trafficRed });

export function hasFixedColor(kind) {
  return Object.hasOwn(FIXED_TINTS, kind);
}

export function vehicleTint(kind, color) {
  return hasFixedColor(kind) ? FIXED_TINTS[kind] : vehicleColor(color).value;
}

const VEHICLE_DRAWERS = Object.freeze({
  car: drawPlayerCar,
  motorbike: drawMotorbike,
  kart: drawKart,
  truck: drawTruck,
  bus: drawBus,
  tractor: drawTractor,
  police: drawPolice,
  firetruck: drawFiretruck,
  racecar: drawRacecar,
  icecream: drawIcecream,
  rocket: drawRocket
});

export function drawPlayerVehicle(ctx, x, y, width, height, {
  kind = 'car',
  color = 'sunshine',
  steer = 0,
  bumped = false,
  time = 0,
  braking = false,
  headlights = false,
  accelerating = false
} = {}) {
  const draw = VEHICLE_DRAWERS[kind] || drawPlayerCar;
  draw(ctx, x, y, width, height, { color, steer, bumped, time, braking, headlights, accelerating });
}

export { VEHICLE_COLORS } from './art-vehicles-base.js';
