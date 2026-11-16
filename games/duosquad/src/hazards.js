import { placeOf, swing } from "./waves.js";

export const GONE_V = 1.1;

// speed in field heights a step, drift and sway in field widths, size in field units
export const RULES = Object.freeze({
  space: Object.freeze({ speed: 0.0065, drift: 0, sway: 0, period: 1, size: 0.11 }),
  sea: Object.freeze({ speed: 0.0048, drift: 0, sway: 0.09, period: 90, size: 0.13 }),
  land: Object.freeze({ speed: 0.006, drift: 0.0035, sway: 0, period: 1, size: 0.11 }),
});

const LOW = 0.06;
const SPAN = 0.88;

function fold(u) {
  const turns = (u - LOW) / SPAN;
  const part = turns - 2 * Math.floor(turns / 2);
  return LOW + (part > 1 ? 2 - part : part) * SPAN;
}

function flightOf(rule, from, age, side) {
  return { u: fold(from.u + side * rule.drift * age + rule.sway * swing(age / rule.period)), v: from.v + rule.speed * age };
}

export function hazardsAt(schedule, { pops, starts }, step, rule) {
  const flying = [];
  for (const group of schedule.groups) {
    const age = step - starts[group.at];
    for (const enemy of group.enemies) {
      const pop = pops.get(enemy.id);
      for (let turn = Math.floor((age - enemy.phase) / enemy.every); turn >= 0; turn -= 1) {
        const thrown = enemy.phase + turn * enemy.every;
        const from = placeOf(group, enemy, thrown, schedule.pace);
        const place = flightOf(rule, from, age - thrown, (enemy.id + turn) % 2 ? 1 : -1);
        if (place.v > GONE_V) break;
        if (!pop || pop.t > starts[group.at] + thrown) flying.push({ key: enemy.id * 64 + (turn % 64), enemy: enemy.id, ...place });
      }
    }
  }
  return flying;
}
