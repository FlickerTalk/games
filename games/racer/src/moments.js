export const MOMENT_SECONDS = { tip: 0.6, bump: 0.9, splash: 0.8 };

function add(game, moment) {
  game.moments.push({ ...moment, startedAt: game.time });
}

export function noteCrash(game, car, hit) {
  if (hit.kind === 'puddle') {
    add(game, { kind: 'splash', x: car.x, distance: hit.distance, by: car.kind });
    return;
  }
  if (hit.kind === 'cone') add(game, { kind: 'tip', thing: hit, by: car.kind });
  add(game, { kind: 'bump', thing: car, by: car.kind });
}

export function activeMoments(game) {
  const age = (moment) => game.time - moment.startedAt;
  game.moments = game.moments.filter((moment) => age(moment) < MOMENT_SECONDS[moment.kind]);
  return game.moments.map((moment) => ({ ...moment, progress: age(moment) / MOMENT_SECONDS[moment.kind] }));
}
