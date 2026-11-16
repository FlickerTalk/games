import { test } from 'vitest';
import assert from 'node:assert/strict';
import { levelSettings, raceSeconds, RACE, LONGEST_RACE_SECONDS } from '../src/tuning.js';

test('the robot is clearly slower and clumsier than the player on the first level', () => {
  const first = levelSettings(1);
  assert.ok(first.robotSpeedFactor <= 0.85);
  assert.ok(first.robotMistakeChance >= 0.3);
});

test('every level is at least as hard as the one before', () => {
  for (let level = 2; level <= 40; level += 1) {
    const before = levelSettings(level - 1);
    const now = levelSettings(level);
    assert.ok(now.topSpeed >= before.topSpeed);
    assert.ok(now.robotSpeedFactor >= before.robotSpeedFactor);
    assert.ok(now.robotMistakeChance <= before.robotMistakeChance);
  }
});

test('difficulty stops growing at its limits', () => {
  const far = levelSettings(1000);
  assert.deepEqual(far, levelSettings(2000));
  assert.ok(far.robotSpeedFactor < 1);
  assert.ok(far.robotMistakeChance > 0);
});

test('a first level at full speed lasts between 25 and 60 seconds', () => {
  const first = levelSettings(1);
  const seconds = first.trackLength / first.topSpeed;
  assert.ok(seconds >= 25 && seconds <= 60, `${seconds} s`);
});

const pace = ({ topSpeed, robotSpeedFactor, robotMistakeChance }) => ({ topSpeed, robotSpeedFactor, robotMistakeChance });

test('difficulty stops rising by level 6, at about what level 5 used to be, and only the length of the race goes on changing', () => {
  const plateau = levelSettings(6);
  for (const level of [7, 12, 30, 500]) assert.deepEqual(pace(levelSettings(level)), pace(plateau));
  assert.ok(plateau.topSpeed <= 14);
  assert.ok(plateau.robotSpeedFactor <= 0.88);
  assert.ok(plateau.robotMistakeChance >= 0.25);
});

test('each level has its race time at full speed: longer within each block of four levels, shorter again at the next block', () => {
  const planned = [35, 40, 45, 55, 45, 50, 60, 70, 55, 65, 75, 90];
  planned.forEach((seconds, index) => assert.equal(raceSeconds(index + 1), seconds, `level ${index + 1}`));
  for (const first of [1, 5, 9]) {
    const block = [0, 1, 2, 3].map((step) => raceSeconds(first + step));
    for (let step = 1; step < 4; step += 1) assert.ok(block[step] > block[step - 1], `level ${first + step}`);
    assert.ok(raceSeconds(first + 4) < block[3] && raceSeconds(first + 4) > block[0], `level ${first + 4}`);
  }
});

test('from level 13 the last block repeats, 60, 70, 80 and 90 seconds, and no race is ever longer than 90', () => {
  for (let level = 13; level <= 60; level += 1) assert.equal(raceSeconds(level), [60, 70, 80, 90][(level - 13) % 4], `level ${level}`);
  assert.equal(LONGEST_RACE_SECONDS, 90);
  for (let level = 1; level <= 300; level += 1) {
    for (const losses of [0, 1, 2]) assert.ok(raceSeconds(level, losses) <= LONGEST_RACE_SECONDS);
  }
});

test('the track is as long as the race time at the level\'s top speed', () => {
  for (let level = 1; level <= 30; level += 1) {
    for (const losses of [0, 1, 2]) {
      const settings = levelSettings(level, losses);
      assert.equal(settings.raceSeconds, raceSeconds(level, losses));
      assert.ok(Math.abs(settings.trackLength - settings.raceSeconds * settings.topSpeed) < 1e-9, `level ${level}`);
    }
  }
});

function today(level) {
  const steps = level - 1;
  return { length: Math.min(320 + 40 * steps, 520), traffic: Math.floor(Math.min(2 + steps, 6)), hazards: Math.floor(Math.min(3 + 1.5 * steps, 8)) };
}

test('traffic and hazards keep the density per distance each level has today, so a longer track carries more of them', () => {
  for (let level = 1; level <= 30; level += 1) {
    for (const losses of [0, 2]) {
      const settings = levelSettings(level, losses);
      const reference = today(level);
      assert.equal(settings.trafficCount, Math.round((reference.traffic * settings.trackLength) / reference.length), `level ${level} traffic`);
      assert.equal(settings.hazardCount, Math.round((reference.hazards * settings.trackLength) / reference.length), `level ${level} hazards`);
    }
  }
  assert.ok(levelSettings(12).hazardCount > levelSettings(6).hazardCount);
});

test('after two lost races in a row the race takes the time of the level before, but never more than its own', () => {
  assert.deepEqual([raceSeconds(4, 2), raceSeconds(8, 2), raceSeconds(12, 2), raceSeconds(16, 2)], [45, 60, 75, 80]);
  assert.deepEqual([raceSeconds(5, 2), raceSeconds(9, 2), raceSeconds(13, 2)], [45, 55, 60]);
  assert.equal(raceSeconds(1, 2), 35);
  assert.equal(raceSeconds(4, 1), 55);
});

test('after two lost races in a row the robot is clearly slower and clumsier', () => {
  for (const level of [1, 5, 30]) {
    const fresh = levelSettings(level);
    assert.deepEqual(levelSettings(level, 1), fresh);
    const eased = levelSettings(level, RACE.easeAfterLosses);
    assert.ok(eased.robotSpeedFactor <= fresh.robotSpeedFactor - 0.08);
    assert.ok(eased.robotMistakeChance >= fresh.robotMistakeChance + 0.15);
    assert.equal(eased.topSpeed, fresh.topSpeed);
    assert.ok(eased.trackLength <= fresh.trackLength);
  }
  assert.ok(RACE.easeAfterLosses === 2 && RACE.moveOnAfterLosses === 3);
});
