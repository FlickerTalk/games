import { createRandom } from '../src/random.js';
import { clearPathX } from '../src/robot.js';
import { createGame, pressGo, stepGame } from '../src/game.js';

export const FRAME = 1 / 60;

const CHILD = { lookAhead: 7, reaction: 0.6, wobble: 0.6, missChance: 0.3, liftEverySeconds: 5, liftSeconds: 1 };

export function childDriver(seed, habits = {}) {
  const child = { ...CHILD, ...habits };
  const random = createRandom(seed);
  const mind = { clock: 0, goal: null, decideAt: null, liftUntil: -1, ignored: new Set() };
  return (game) => {
    mind.clock += FRAME;
    if (mind.clock >= mind.liftUntil && random.chance(FRAME / child.liftEverySeconds)) mind.liftUntil = mind.clock + child.liftSeconds;
    const { player, track } = game;
    const ahead = [...track.traffic, ...track.hazards].filter((thing) => !mind.ignored.has(thing));
    const clearX = clearPathX(player, ahead, child.lookAhead);
    if (clearX !== player.x && mind.decideAt === null) {
      const blocking = ahead.find((thing) => !thing.knocked && thing.distance > player.distance && Math.abs(thing.x - player.x) < 1.6);
      if (blocking && random.chance(child.missChance)) mind.ignored.add(blocking);
      else mind.decideAt = mind.clock + child.reaction;
    }
    if (mind.decideAt !== null && mind.clock >= mind.decideAt) {
      mind.decideAt = null;
      mind.goal = clearPathX(player, ahead, child.lookAhead * 2) + random.range(-child.wobble, child.wobble);
    }
    return { accelerate: mind.clock >= mind.liftUntil, steer: 0, targetX: mind.goal };
  };
}

export function raceOnce({ level, seed, driver, game = createGame({ level, seed }), watch = () => {} }) {
  pressGo(game);
  const start = game.attempts;
  for (let t = 0; t < 600 && game.attempts === start && game.state !== 'finished'; t += FRAME) {
    stepGame(game, driver(game), FRAME);
    watch(game);
  }
  const result = {
    won: game.lastResult === 'won' && game.state === 'finished',
    raceTime: game.raceTime,
    gap: Math.abs(game.player.distance - game.robot.distance),
  };
  for (let t = 0; t < 10 && game.state === 'finished'; t += FRAME) stepGame(game, driver(game), FRAME);
  return { ...result, game };
}
