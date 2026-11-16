import { levelSettings, RACE, ROAD_HALF_WIDTH, ROBOT_PACE } from './tuning.js';
import { buildTrack } from './track.js';
import { createCar, driveCar, crash, separate } from './cars.js';
import { createBrain, robotInput, steerTraffic, robotPace, makeWay, learnFrom } from './robot.js';
import { createRandom } from './random.js';
import { noteCrash } from './moments.js';

const COASTING = { accelerate: false, steer: 0, targetX: null };
const STREAK_EASING_SECONDS = 0.35;
const CLOCKED = new Set(['countdown', 'racing', 'finished']);

export function createGame({ level = 1, seed = 1, robot = true } = {}) {
  const game = { seed, attempts: 0, lastResult: null, time: 0, losses: 0, wins: 0, luck: createRandom(seed * 92821 + 17), duel: !robot };
  prepareLevel(game, Math.max(1, Math.floor(level)));
  return game;
}

function prepareLevel(game, level) {
  game.attempts += 1;
  game.level = level;
  game.settings = levelSettings(level, game.losses);
  game.track = buildTrack(game.settings, createRandom(game.seed * 7919 + level));
  game.player = createCar({ kind: 'player', x: -RACE.startOffsetX });
  game.robot = game.duel ? null : createCar({ kind: 'robot', x: RACE.startOffsetX });
  game.brain = game.duel ? null : createBrain(createRandom(game.seed * 104729 + game.attempts), game.settings.robotMistakeChance);
  game.finishTime = null;
  game.state = 'ready';
  game.timer = 0;
  game.raceTime = 0;
  game.goLight = 0;
  game.streaks = 0;
  game.moments = [];
  game.robotPace = 1;
}

function countFrom(game, seconds) {
  game.state = 'countdown';
  game.timer = seconds;
  game.countdownLength = seconds;
}

export function pressGo(game) {
  if (game.state === 'ready') countFrom(game, RACE.countdownSeconds);
}

export function pauseRace(game) {
  if (game.state === 'countdown' || game.state === 'racing') game.state = 'paused';
}

export function resumeRace(game) {
  if (game.state === 'paused') countFrom(game, RACE.resumeCountdownSeconds);
}

export function stepGame(game, input, dt) {
  if (CLOCKED.has(game.state)) game.time += dt;
  if (game.state === 'countdown') countDown(game, dt);
  else if (game.state === 'racing') race(game, input, dt);
  else if (game.state === 'finished') rollOut(game, dt);
}

export function raceProgress(game) {
  const share = (car) => (car ? Math.min(1, Math.max(0, car.distance / game.track.length)) : 0);
  return { player: share(game.player), robot: share(game.robot) };
}

function countDown(game, dt) {
  game.timer -= dt;
  if (game.timer > 0) return;
  game.state = 'racing';
  game.goLight = RACE.goLightSeconds;
}

function race(game, input, dt) {
  game.raceTime += dt;
  game.goLight = Math.max(0, game.goLight - dt);
  moveWorld(game, input, dt);
  if (game.player.distance >= game.track.length) finish(game, 'won');
  else if (game.robot && game.robot.distance >= game.track.length) finish(game, 'lost');
}

function finish(game, result) {
  game.state = 'finished';
  game.lastResult = result;
  game.finishTime = result === 'won' ? game.raceTime : null;
  game.losses = result === 'won' ? 0 : game.losses + 1;
  game.timer = RACE.finishPauseSeconds;
}

function rollOut(game, dt) {
  game.timer -= dt;
  moveWorld(game, COASTING, dt);
  if (game.timer > 0 || game.duel) return;
  const movesOn = game.lastResult === 'won' || game.losses >= RACE.moveOnAfterLosses;
  if (movesOn) Object.assign(game, { lastResult: 'won', losses: 0, wins: game.wins + 1 });
  prepareLevel(game, movesOn ? game.level + 1 : game.level);
}

function moveWorld(game, input, dt) {
  const { track, player, robot, settings } = game;
  const obstacles = [...track.traffic, ...track.hazards];
  for (const car of track.traffic) {
    steerTraffic(car, track.hazards, dt);
    car.distance += car.speed * dt;
  }
  slideKnockedCones(track.hazards, dt);
  driveCar(player, input, settings.topSpeed, dt);
  if (robot) driveCar(robot, robotInput(robot, game.brain, obstacles), robotTopSpeed(game, dt), dt);
  for (const car of robot ? [player, robot] : [player]) {
    const hit = crash(car, obstacles);
    if (!hit) continue;
    noteCrash(game, car, hit);
    if (car === robot) learnFrom(game.brain, hit);
    else if (hit.kind === 'traffic') makeWay(hit, player);
  }
  if (robot) separate(player, robot);
  showDriving(game, input, dt);
}

function robotTopSpeed(game, dt) {
  const { player, robot, settings } = game;
  const wanted = robotPace(robot.distance - player.distance);
  game.robotPace += (wanted - game.robotPace) * (1 - Math.exp(-dt / ROBOT_PACE.easingSeconds));
  return settings.topSpeed * Math.min(ROBOT_PACE.ceiling, settings.robotSpeedFactor * game.robotPace);
}

function showDriving(game, input, dt) {
  const { player, settings } = game;
  player.pressing = input.accelerate;
  player.braking = !input.accelerate && player.speed > 0.2;
  const wanted = input.accelerate ? Math.min(1, player.speed / settings.topSpeed) : 0;
  game.streaks += (wanted - game.streaks) * (1 - Math.exp(-dt / STREAK_EASING_SECONDS));
}

function slideKnockedCones(hazards, dt) {
  const edge = ROAD_HALF_WIDTH + 1.2;
  for (const cone of hazards) {
    if (!cone.knocked || Math.abs(cone.x) >= edge) continue;
    cone.x = Math.max(-edge, Math.min(edge, cone.x + cone.knockDirection * 5 * dt));
  }
}
