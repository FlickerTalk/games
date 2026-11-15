import { wholeFrom } from "./duration.js";

export const isPlain = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

function checkValue(name, value) {
  const { first, step, limit, eased = 0 } = isPlain(value) ? value : {};
  if (![first, step, limit].every(Number.isFinite)) throw new TypeError(`the curve's ${name} needs first, step and limit as numbers`);
  if (step === 0) throw new TypeError(`the curve's ${name} needs a step other than 0`);
  if ((limit - first) / step < 0) throw new TypeError(`the curve's ${name} never reaches its limit: step towards it`);
  if (!Number.isFinite(eased)) throw new TypeError(`the curve's ${name} eases by a number`);
  // floating point: 0.08 / 0.02 is 4.000000000000001, which must still be four steps
  const reach = Math.max(0, Math.ceil((limit - first) / step - 1e-9));
  return Object.freeze({ first, step, limit, eased, reach });
}

export function checkCurve(curve) {
  if (!isPlain(curve)) throw new TypeError("a game's progress curve is an object of values");
  return Object.freeze(Object.fromEntries(Object.entries(curve).map(([name, value]) => [name, checkValue(name, value)])));
}

function along({ first, step, limit, reach }, steps) {
  return steps >= reach ? limit : first + step * steps;
}

export function curveAt(curve, level, eased = false) {
  const steps = wholeFrom(level, 1) - 1;
  return Object.fromEntries(Object.entries(curve).map(([name, value]) => [name, along(value, steps) + (eased ? value.eased : 0)]));
}

export function plateauOf(curve) {
  return Object.values(curve).reduce((plateau, { reach }) => Math.max(plateau, reach + 1), 1);
}
