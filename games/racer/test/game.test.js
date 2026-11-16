import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createGame, pressGo, stepGame, raceProgress, pauseRace, resumeRace } from '../src/game.js';
import { clearPathX } from '../src/robot.js';
import { RACE, levelSettings, raceSeconds } from '../src/tuning.js';
import { activeMoments } from '../src/moments.js';

const frame = 1 / 60;
const idle = { accelerate: false, steer: 0, targetX: null };

function run(game, seconds, driver, until = () => false) {
  for (let t = 0; t < seconds && !until(game); t += frame) stepGame(game, driver(game), frame);
}

function goodDriver(game) {
  const obstacles = [...game.track.traffic, ...game.track.hazards];
  return { accelerate: true, steer: 0, targetX: clearPathX(game.player, obstacles, 16) };
}

function startRace(game) {
  pressGo(game);
  run(game, RACE.countdownSeconds + 0.1, () => idle);
}

test('a new game waits on the start line until go is pressed', () => {
  const game = createGame();
  assert.equal(game.state, 'ready');
  assert.equal(game.level, 1);
  run(game, 2, () => ({ ...idle, accelerate: true }));
  assert.equal(game.player.distance, 0);
  assert.equal(game.robot.distance, 0);
});

test('go starts a short countdown and then the race', () => {
  const game = createGame();
  pressGo(game);
  assert.equal(game.state, 'countdown');
  run(game, RACE.countdownSeconds + 0.1, () => idle);
  assert.equal(game.state, 'racing');
});

test('driving well wins the level and moves on to a harder one', () => {
  const game = createGame({ seed: 3 });
  const firstTopSpeed = game.settings.topSpeed;
  startRace(game);
  run(game, 120, goodDriver, (g) => g.level === 2);
  assert.equal(game.level, 2);
  assert.equal(game.state, 'ready');
  assert.equal(game.lastResult, 'won');
  assert.ok(game.settings.topSpeed > firstTopSpeed);
  assert.equal(game.player.distance, 0);
});

test('the robot finishes on its own and then the same level is replayed with the same road', () => {
  const game = createGame({ seed: 3 });
  const road = JSON.stringify(game.track.hazards.map(({ x, distance }) => [x, distance]));
  startRace(game);
  run(game, 90, () => idle, (g) => g.state === 'finished');
  assert.equal(game.state, 'finished');
  assert.equal(game.lastResult, 'lost');
  assert.ok(game.robot.distance >= game.track.length);
  run(game, RACE.finishPauseSeconds + 0.1, () => idle);
  assert.equal(game.state, 'ready');
  assert.equal(game.level, 1);
  assert.equal(JSON.stringify(game.track.hazards.map(({ x, distance }) => [x, distance])), road);
});

test('hitting something slows the player down without ending the race', () => {
  const game = createGame();
  startRace(game);
  game.track.traffic = [];
  game.track.hazards = [{ kind: 'cone', x: game.player.x, distance: 30, width: 0.5, length: 0.5, knocked: false }];
  let speedBefore = 0;
  run(game, 20, (g) => {
    speedBefore = g.player.speed;
    return { ...idle, accelerate: true };
  }, (g) => g.player.bumpTimer > 0);
  assert.ok(game.player.bumpTimer > 0);
  assert.ok(game.player.speed < speedBefore * 0.5);
  assert.equal(game.state, 'racing');
});

test('a game can start at any level', () => {
  const game = createGame({ level: 6 });
  assert.equal(game.level, 6);
  assert.equal(game.track.length, game.settings.trackLength);
});

test('progress tells how far along the stretch each car is', () => {
  const game = createGame();
  assert.deepEqual(raceProgress(game), { player: 0, robot: 0 });
  startRace(game);
  run(game, 5, () => ({ ...idle, accelerate: true }));
  const progress = raceProgress(game);
  assert.ok(progress.player > 0 && progress.player < 1);
  assert.ok(progress.robot > 0 && progress.robot < 1);
});

const going = { ...idle, accelerate: true };

test('a paused race stands still until it is resumed, then counts down a short second', () => {
  const game = createGame({ seed: 3 });
  startRace(game);
  run(game, 3, () => going);
  const { distance, speed, x } = game.player;
  const raceTime = game.raceTime;
  pauseRace(game);
  assert.equal(game.state, 'paused');
  run(game, 2, () => going);
  assert.deepEqual([game.player.distance, game.player.speed, game.player.x, game.raceTime], [distance, speed, x, raceTime]);
  resumeRace(game);
  assert.equal(game.state, 'countdown');
  assert.equal(game.timer, RACE.resumeCountdownSeconds);
  assert.ok(RACE.resumeCountdownSeconds <= 1 && RACE.resumeCountdownSeconds < RACE.countdownSeconds);
  run(game, RACE.resumeCountdownSeconds - 0.1, () => going);
  assert.equal(game.state, 'countdown');
  assert.equal(game.player.distance, distance);
  run(game, 0.2, () => going);
  assert.equal(game.state, 'racing');
  assert.ok(game.raceTime >= raceTime && game.raceTime < raceTime + 0.2);
});

test('only a race under way can be paused, and only a paused race resumed', () => {
  const game = createGame();
  pauseRace(game);
  assert.equal(game.state, 'ready');
  resumeRace(game);
  assert.equal(game.state, 'ready');
  pressGo(game);
  pauseRace(game);
  assert.equal(game.state, 'paused');
  resumeRace(game);
  assert.equal(game.state, 'countdown');
  run(game, 2, () => idle);
  resumeRace(game);
  assert.equal(game.state, 'racing');
});

test('the green lights show for a moment whenever a countdown ends', () => {
  const game = createGame();
  startRace(game);
  assert.ok(game.goLight > 0);
  run(game, 1, () => idle);
  assert.equal(game.goLight, 0);
  pauseRace(game);
  resumeRace(game);
  run(game, RACE.resumeCountdownSeconds + 0.05, () => idle);
  assert.ok(game.goLight > 0);
});

test('the game keeps its own clock, which stands still on the card and while paused', () => {
  const game = createGame();
  run(game, 1, () => going);
  assert.equal(game.time, 0);
  pressGo(game);
  run(game, 1, () => idle);
  assert.ok(Math.abs(game.time - 1) < 0.02);
  pauseRace(game);
  run(game, 1, () => going);
  assert.ok(Math.abs(game.time - 1) < 0.02);
});

test('the player presses while the finger is down and brakes once it is lifted', () => {
  const game = createGame();
  startRace(game);
  run(game, 2, () => going);
  assert.equal(game.player.pressing, true);
  assert.equal(game.player.braking, false);
  run(game, 0.2, () => idle);
  assert.equal(game.player.pressing, false);
  assert.equal(game.player.braking, true);
  run(game, 8, () => idle);
  assert.equal(game.player.braking, false);
});

test('speed streaks build while pressing at speed and fade after letting go', () => {
  const game = createGame();
  startRace(game);
  assert.ok(game.streaks < 0.05);
  run(game, 3, () => going);
  assert.ok(game.streaks > 0.7, `${game.streaks}`);
  run(game, 1.5, () => idle);
  assert.ok(game.streaks < 0.15, `${game.streaks}`);
});

test('a crash during the race is kept as a moment to draw', () => {
  const game = createGame();
  startRace(game);
  game.track.traffic = [];
  game.track.hazards = [{ kind: 'cone', x: game.player.x, distance: 20, width: 0.8, length: 0.8, knocked: false }];
  run(game, 10, () => going, (g) => g.player.bumpTimer > 0);
  assert.deepEqual(activeMoments(game).map((moment) => moment.kind).sort(), ['bump', 'tip']);
});

function loseOnce(game) {
  startRace(game);
  run(game, 120, () => idle, (g) => g.state === 'ready');
}

test('two losses in a row on a level make the robot slower and clumsier for the next try', () => {
  const game = createGame({ level: 7, seed: 4 });
  const usual = levelSettings(7);
  loseOnce(game);
  assert.deepEqual([game.level, game.losses], [7, 1]);
  assert.equal(game.settings.robotSpeedFactor, usual.robotSpeedFactor);
  loseOnce(game);
  assert.deepEqual([game.level, game.losses], [7, 2]);
  assert.ok(game.settings.robotSpeedFactor < usual.robotSpeedFactor);
  assert.ok(game.brain.mistakeChance > usual.robotMistakeChance);
});

test('a third loss in a row moves on to the next level with the same celebration as a win', () => {
  const game = createGame({ level: 7, seed: 4 });
  loseOnce(game);
  loseOnce(game);
  startRace(game);
  run(game, 120, () => idle, (g) => g.state === 'finished');
  assert.equal(game.robot.distance >= game.track.length, true);
  run(game, RACE.finishPauseSeconds + 0.1, () => idle);
  assert.deepEqual([game.state, game.level, game.lastResult, game.losses], ['ready', 8, 'won', 0]);
  assert.deepEqual(game.settings, levelSettings(8));
});

test('a win clears the count of losses', () => {
  const game = createGame({ seed: 3 });
  loseOnce(game);
  assert.equal(game.losses, 1);
  startRace(game);
  run(game, 120, goodDriver, (g) => g.state === 'ready');
  assert.deepEqual([game.level, game.losses, game.lastResult], [2, 0, 'won']);
  loseOnce(game);
  loseOnce(game);
  assert.deepEqual([game.level, game.losses], [2, 2]);
});

function robotPaceDuring(game, seconds, driver) {
  const speeds = [];
  run(game, seconds, (g) => {
    speeds.push([g.robot.speed, g.robot.distance]);
    return driver(g);
  });
  return speeds;
}

test('a robot far ahead eases off so the player can catch up', () => {
  const alone = createGame({ level: 5, seed: 2 });
  const ahead = createGame({ level: 5, seed: 2 });
  for (const game of [alone, ahead]) {
    startRace(game);
    game.track.traffic = [];
    game.track.hazards = [];
    run(game, 6, () => going);
  }
  ahead.robot.distance = ahead.player.distance + 40;
  run(alone, 4, () => going);
  run(ahead, 4, () => going);
  assert.ok(ahead.robot.speed < alone.robot.speed * 0.92, `${ahead.robot.speed} vs ${alone.robot.speed}`);
  assert.ok(ahead.robot.speed > alone.robot.speed * 0.7);
});

test('a robot far behind pushes a little, but never past the player\'s top speed', () => {
  const game = createGame({ level: 30, seed: 2 });
  startRace(game);
  game.track.traffic = [];
  game.track.hazards = [];
  game.player.distance = 60;
  run(game, 8, () => going);
  const usual = game.settings.topSpeed * game.settings.robotSpeedFactor;
  assert.ok(game.robot.speed > usual * 1.03, `${game.robot.speed} vs ${usual}`);
  assert.ok(game.robot.speed < game.settings.topSpeed * 0.96);
});

test('the robot changes speed smoothly and never jumps along the road', () => {
  const game = createGame({ level: 5, seed: 2 });
  startRace(game);
  game.track.traffic = [];
  game.track.hazards = [];
  run(game, 3, () => going);
  game.player.distance += 30;
  const steps = robotPaceDuring(game, 6, () => idle);
  for (let i = 1; i < steps.length; i += 1) {
    const [speed, distance] = steps[i];
    const [lastSpeed, lastDistance] = steps[i - 1];
    assert.ok(Math.abs(speed - lastSpeed) <= 6 * frame + 1e-9, `speed ${lastSpeed} -> ${speed}`);
    assert.ok(distance - lastDistance <= speed * frame + 1e-9 && distance >= lastDistance);
  }
});

test('a traffic car the player bumps moves out of the way, so a player who never steers hits it only once', () => {
  const game = createGame({ level: 5, seed: 2 });
  startRace(game);
  const [car] = game.track.traffic;
  game.track.hazards = [];
  game.track.traffic = [car];
  Object.assign(car, { x: game.player.x, distance: game.player.distance + 12, laneX: undefined });
  run(game, 25, () => going);
  const bumps = game.moments.filter((moment) => moment.kind === 'bump' && moment.thing === game.player);
  assert.equal(bumps.length, 1);
  assert.ok(game.player.distance > car.distance + 10);
  assert.ok(Math.abs(car.x - game.player.x) > 1.5);
});

test('a robot that bumps into a car it overlooked steers around it instead of ramming it again', () => {
  const game = createGame({ level: 5, seed: 2 });
  startRace(game);
  const [car] = game.track.traffic;
  game.track.hazards = [];
  game.track.traffic = [car];
  Object.assign(car, { x: game.robot.x, distance: game.robot.distance + 12, laneX: undefined });
  game.brain.decisions.set(car, true);
  run(game, 25, () => going);
  const bumps = game.moments.filter((moment) => moment.kind === 'bump' && moment.thing === game.robot);
  assert.equal(bumps.length, 1);
  assert.ok(game.robot.distance > car.distance + 10);
});

test('every move to the next level counts as a win, a real one or the one after three losses', () => {
  const game = createGame({ seed: 3 });
  assert.equal(game.wins, 0);
  startRace(game);
  run(game, 120, goodDriver, (g) => g.state === 'ready');
  assert.deepEqual([game.level, game.wins], [2, 1]);
  loseOnce(game);
  loseOnce(game);
  assert.equal(game.wins, 1);
  loseOnce(game);
  assert.deepEqual([game.level, game.wins], [3, 2]);
});

test('a game carries its own seeded luck for surprises', () => {
  const draws = (seed) => {
    const { luck } = createGame({ seed });
    return [luck.next(), luck.next(), luck.next()];
  };
  assert.deepEqual(draws(5), draws(5));
  assert.notDeepEqual(draws(5), draws(6));
});

test('a race with a friend has no robot, keeps its finish time and does not move on by itself', () => {
  const game = createGame({ level: 3, seed: 5, robot: false });
  assert.equal(game.robot, null);
  assert.deepEqual(raceProgress(game), { player: 0, robot: 0 });
  startRace(game);
  run(game, 120, goodDriver, (g) => g.state === 'finished');
  assert.equal(game.state, 'finished');
  assert.ok(Math.abs(game.finishTime - game.raceTime) < 1e-9 && game.finishTime > 10);
  run(game, 20, () => idle);
  assert.deepEqual([game.state, game.level], ['finished', 3]);
});

test('two phones with the same seed and level get exactly the same road', () => {
  const road = (game) => JSON.stringify([game.track.hazards, game.track.traffic]);
  assert.equal(road(createGame({ level: 7, seed: 99, robot: false })), road(createGame({ level: 7, seed: 99, robot: false })));
  assert.notEqual(road(createGame({ level: 7, seed: 99, robot: false })), road(createGame({ level: 7, seed: 98, robot: false })));
});

test('two phones racing each other build exactly the same track from the same level and race id', () => {
  for (let level = 1; level <= 16; level += 1) {
    for (const seed of [1, 77, 4242]) {
      const mine = createGame({ level, seed, robot: false });
      const theirs = createGame({ level, seed, robot: false });
      assert.deepEqual(theirs.track, mine.track, `level ${level} seed ${seed}`);
      assert.equal(mine.settings.raceSeconds, raceSeconds(level));
    }
  }
});
