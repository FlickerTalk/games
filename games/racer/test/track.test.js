import { test } from 'vitest';
import assert from 'node:assert/strict';
import { buildTrack, laneCenters, clampToRoad } from '../src/track.js';
import { createRandom } from '../src/random.js';
import { levelSettings, ROAD_HALF_WIDTH, RACE, SIZES } from '../src/tuning.js';

test('lanes are spread evenly and symmetrically across the road', () => {
  assert.equal(laneCenters.length, 3);
  assert.equal(laneCenters[1], 0);
  assert.ok(Math.abs(laneCenters[0] + laneCenters[2]) < 1e-9);
  assert.ok(laneCenters[2] < ROAD_HALF_WIDTH);
});

test('a car is kept on the road', () => {
  assert.equal(clampToRoad(10, 0.45), ROAD_HALF_WIDTH - 0.45);
  assert.equal(clampToRoad(-10, 0.45), -(ROAD_HALF_WIDTH - 0.45));
  assert.equal(clampToRoad(0.5, 0.45), 0.5);
});

test('a track has the length, traffic and hazards its level asks for', () => {
  const settings = levelSettings(3);
  const track = buildTrack(settings, createRandom(7));
  assert.equal(track.length, settings.trackLength);
  assert.equal(track.traffic.length, Math.floor(settings.trafficCount));
  assert.equal(track.hazards.length, Math.floor(settings.hazardCount));
});

test('nothing blocks the start and everything sits on the road before the finish', () => {
  const track = buildTrack(levelSettings(9), createRandom(11));
  for (const thing of [...track.traffic, ...track.hazards]) {
    assert.ok(thing.distance >= RACE.startClearDistance);
    assert.ok(thing.distance < track.length);
    assert.ok(Math.abs(thing.x) + thing.width / 2 <= ROAD_HALF_WIDTH);
  }
});

test('the same seed builds the same track', () => {
  const settings = levelSettings(4);
  assert.deepEqual(buildTrack(settings, createRandom(5)), buildTrack(settings, createRandom(5)));
});

test('hazards are cones and puddles, and traffic drives slower than the player', () => {
  const settings = levelSettings(6);
  const track = buildTrack(settings, createRandom(2));
  for (const hazard of track.hazards) {
    assert.ok(['cone', 'puddle'].includes(hazard.kind));
    assert.equal(hazard.width, SIZES[hazard.kind].width);
  }
  for (const car of track.traffic) {
    assert.equal(car.kind, 'traffic');
    assert.ok(car.speed > 0 && car.speed < settings.topSpeed);
  }
});

test('traffic comes in four shapes and the bus is the longest', () => {
  const traffic = [1, 2, 3, 4].flatMap((seed) => buildTrack(levelSettings(30), createRandom(seed)).traffic);
  const variants = new Set(traffic.map((car) => car.variant));
  assert.deepEqual([...variants].sort(), [0, 1, 2, 3]);
  for (const car of traffic) {
    const size = car.variant === 3 ? SIZES.bus : SIZES.traffic;
    assert.deepEqual([car.width, car.length], [size.width, size.length]);
  }
  assert.ok(SIZES.bus.length > SIZES.traffic.length);
});

const nearestLane = (x) => laneCenters.reduce((best, lane) => (Math.abs(lane - x) < Math.abs(best - x) ? lane : best));

test('every hazard sits in a lane, so it never blocks two lanes at once', () => {
  for (const level of [1, 5, 30]) {
    for (let seed = 1; seed <= 20; seed += 1) {
      for (const hazard of buildTrack(levelSettings(level), createRandom(seed)).hazards) {
        assert.ok(Math.abs(hazard.x - nearestLane(hazard.x)) <= 0.3, `${hazard.kind} at ${hazard.x}`);
      }
    }
  }
});

test('hazards and traffic are spread out, so each one can be seen and passed on its own', () => {
  for (const level of [1, 5, 30]) {
    for (let seed = 1; seed <= 20; seed += 1) {
      const track = buildTrack(levelSettings(level), createRandom(seed));
      for (const group of [track.hazards, track.traffic]) {
        const distances = group.map((thing) => thing.distance).sort((a, b) => a - b);
        for (let i = 1; i < distances.length; i += 1) assert.ok(distances[i] - distances[i - 1] >= 15, `level ${level} seed ${seed}`);
      }
    }
  }
});

test('a race of a minute or more has its halfway point at half the track, and a shorter one has none', () => {
  const long = levelSettings(7);
  assert.equal(long.raceSeconds, 60);
  assert.equal(buildTrack(long, createRandom(3)).halfway, long.trackLength / 2);
  assert.equal(buildTrack(levelSettings(6), createRandom(3)).halfway, null);
  assert.equal(buildTrack(levelSettings(7, 2), createRandom(3)).halfway, null);
});

test('a longer track spreads its traffic and hazards along the whole road, not only near the start', () => {
  const track = buildTrack(levelSettings(12), createRandom(4));
  for (const group of [track.hazards, track.traffic]) {
    const last = Math.max(...group.map((thing) => thing.distance));
    assert.ok(last > track.length * 0.7, `${last} of ${track.length}`);
  }
});
