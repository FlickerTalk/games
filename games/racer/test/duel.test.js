// @vitest-environment node
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { channel, pair, idle, driver } from './duel-channel.js';
import { kindOf, openAbout } from '../src/duel-wire.js';

const phase = (duel) => duel.session.phase;
const road = (duel) => JSON.stringify([duel.game.level, duel.game.track.hazards.map(({ x, distance }) => [x, distance])]);

async function meet(race) {
  const { a, b } = race.duels;
  a.start();
  await race.play(1000, { until: () => phase(b) === 'lobby' });
  b.start();
  await race.play(1000, { until: () => phase(a) === 'countdown' && phase(b) === 'countdown' });
}

test('two phones meet, count down together on the same road, race and agree on who came first', async () => {
  const race = pair(channel({ delay: 30 }), { a: { kind: 'rocket', color: 'mint', topLevel: 9, received: ['rocket'] }, b: { kind: 'bus', topLevel: 3 } });
  const { a, b } = race.duels;
  assert.equal(a.view(0).card.result, 'start');
  await meet(race);
  assert.equal(road(a), road(b));
  assert.equal(a.game.level, 3);
  assert.deepEqual([a.game.track.length, a.game.track.halfway, a.game.settings.raceSeconds], [b.game.track.length, b.game.track.halfway, b.game.settings.raceSeconds]);
  assert.equal(a.game.track.length, a.game.settings.raceSeconds * a.game.settings.topSpeed);
  assert.ok(Math.abs(a.session.startAt - b.session.startAt) < 100);
  await race.play(90000, { until: () => phase(a) === 'over' && phase(b) === 'over' && a.view(race.now).stage === 'card' && b.view(race.now).stage === 'card' });
  assert.notEqual(a.session.result.won, b.session.result.won);
  const first = a.session.result.won ? a : b;
  assert.equal(first.view(race.now).card.result, 'won');
  assert.equal((first === a ? b : a).view(race.now).card.result, 'second');
  assert.deepEqual(race.won, { a: a.session.result.won ? 1 : 0, b: b.session.result.won ? 1 : 0 });
});

test('before the race each phone shows the other\'s vehicle', async () => {
  const race = pair(channel({ delay: 30 }), { a: { kind: 'kart', color: 'coral' }, b: { kind: 'truck', color: 'ocean' } });
  const { a, b } = race.duels;
  a.start();
  await race.play(1000, { until: () => phase(b) === 'lobby' && phase(a) === 'lobby' });
  assert.deepEqual(b.view(race.now).card.rival.vehicle, { kind: 'kart', color: 'coral' });
  assert.equal(b.view(race.now).card.rival.status, 'ready');
  assert.deepEqual(a.view(race.now).card.rival.vehicle, { kind: 'truck', color: 'ocean' });
  assert.equal(a.view(race.now).card.meReady, true);
});

test('a stall and then a burst never make the other vehicle go backwards, and the race still ends', async () => {
  const race = pair(channel({ delay: 40, holdFrom: 9000, holdTo: 11500 }));
  const { a, b } = race.duels;
  await meet(race);
  const seen = [];
  await race.play(90000, {
    until: () => phase(a) === 'over' && phase(b) === 'over',
    watch: (now) => {
      const rival = a.view(now).rival;
      if (rival) seen.push(rival.distance);
    },
  });
  assert.ok(seen.length > 100);
  for (let i = 1; i < seen.length; i += 1) assert.ok(seen[i] >= seen[i - 1] - 1e-9, `backwards at ${i}`);
  assert.notEqual(a.session.result.won, b.session.result.won);
});

test('slow, bunched delivery still gives one race and one result', async () => {
  const race = pair(channel({ delay: 250, batchEvery: 400 }));
  const { a, b } = race.duels;
  await meet(race);
  assert.equal(road(a), road(b));
  await race.play(90000, { until: () => phase(a) === 'over' && phase(b) === 'over' });
  assert.notEqual(a.session.result.won, b.session.result.won);
});

test('when the other leaves mid-race the race ends at once with no winner, on the card that offers a new race or the robot', async () => {
  const net = channel({ delay: 30 });
  const race = pair(net);
  const { a, b } = race.duels;
  await meet(race);
  await race.play(5000);
  b.stop();
  net.ends.b.open = false;
  await race.play(200);
  assert.equal(phase(a), 'left');
  const { stage, card } = a.view(race.now);
  assert.equal(stage, 'card');
  assert.deepEqual([card.offerRobot, card.goShown, card.rival.status], [true, true, 'gone']);
  assert.deepEqual(race.won, { a: 0, b: 0 });
});

test('a phone whose page is hidden leaves the race, the other ends it at once with the rival gone, and the one that left comes back to the start card', async () => {
  const net = channel({ delay: 30 });
  const race = pair(net);
  const { a, b } = race.duels;
  await meet(race);
  await race.play(5000);
  race.hide('a');
  assert.equal(phase(a), 'left');
  assert.equal(kindOf(net.sent.a.at(-1)), 'bye');
  await race.play(200);
  assert.deepEqual([phase(b), b.session.notice], ['left', 'left']);
  assert.equal(b.view(race.now).card.rival.status, 'gone');
  race.hide('a', false);
  await race.play(200);
  const { stage, card } = a.view(race.now);
  assert.equal(stage, 'card');
  assert.deepEqual([card.result, card.goShown, card.offerRobot, card.rival.status], ['start', true, false, 'unknown']);
  assert.deepEqual(race.won, { a: 0, b: 0 });
});

test('a phone that was hidden cannot win the race it left, even when its goodbye was lost and it comes back to drive on', async () => {
  const net = channel({ delay: 30 });
  const race = pair(net);
  const { a, b } = race.duels;
  await meet(race);
  await race.play(8000);
  net.lose('a');
  net.ends.a.open = false;
  race.hide('a');
  await race.play(3000);
  net.lose('a', false);
  net.ends.a.open = true;
  race.hide('a', false);
  await race.play(90000, { until: () => a.view(race.now).stage === 'card' && b.view(race.now).stage === 'card' && phase(b) !== 'running' });
  assert.equal(a.session.result, null);
  assert.equal(a.view(race.now).card.result, 'start');
  assert.deepEqual([phase(b), b.session.notice], ['left', 'left']);
  assert.deepEqual(race.won, { a: 0, b: 0 });
});

test('a race that starts while the page is hidden is left at once', async () => {
  const net = channel({ delay: 30 });
  const race = pair(net);
  const { a, b } = race.duels;
  a.start();
  await race.play(1000, { until: () => phase(b) === 'lobby' && phase(a) === 'lobby' });
  race.hide('a');
  b.start();
  await race.play(500);
  assert.equal(phase(a), 'left');
  assert.deepEqual([phase(b), b.session.notice], ['left', 'left']);
});

test('a page hidden before the race starts changes nothing', async () => {
  const net = channel({ delay: 30 });
  const race = pair(net);
  const { a, b } = race.duels;
  race.hide('a');
  race.hide('a', false);
  assert.equal(phase(a), 'idle');
  a.start();
  await race.play(1000, { until: () => phase(b) === 'lobby' && phase(a) === 'lobby' });
  race.hide('a');
  assert.equal(phase(a), 'lobby');
  assert.equal(net.sent.a.filter((data) => kindOf(data) === 'bye').length, 0);
});

test('when nobody answers the card offers to try again or to race the robot', async () => {
  const net = channel({ delay: 30 });
  net.ends.b.open = false;
  const race = pair(net, { timing: { answer: 50 } });
  const { a } = race.duels;
  a.start();
  assert.deepEqual([a.view(race.now).card.rival.status, a.view(race.now).card.goShown], ['calling', false]);
  await new Promise((resolve) => setTimeout(resolve, 80));
  const { card } = a.view(race.now);
  assert.deepEqual([card.rival.status, card.offerRobot, card.goShown], ['asleep', true, true]);
});

test('a refused message stops everything being sent until the child starts again', async () => {
  const net = channel({ delay: 30 });
  const race = pair(net);
  const { a } = race.duels;
  net.refuse('a');
  a.start();
  await race.play(500);
  const tried = net.sent.a.length;
  assert.equal(phase(a), 'left');
  await race.play(2000);
  assert.equal(net.sent.a.length, tried);
  assert.equal(a.view(race.now).card.offerRobot, true);
});

test('the vehicle goes with every hello, and nothing is sent before the child starts', async () => {
  const net = channel({ delay: 30 });
  const race = pair(net, { a: { kind: 'police', received: ['police'] } });
  await race.play(1000);
  assert.deepEqual([net.sent.a.length, net.sent.b.length], [0, 0]);
  race.duels.a.start();
  await race.play(100);
  const about = openAbout(net.sent.a[0]);
  assert.equal(about.kind, 'police');
  assert.equal(net.sent.a.length, 2);
});

test('a race the child loses still lets them drive to the line before the friendly card', async () => {
  const race = pair(channel({ delay: 30 }));
  const { a, b } = race.duels;
  const slow = (game) => ({ ...driver(game), accelerate: game.raceTime % 3 < 1.2 });
  await meet(race);
  await race.play(120000, { drive: { a: driver, b: slow }, until: () => phase(a) === 'over' && phase(b) === 'over' });
  assert.equal(a.session.result.won, true);
  assert.equal(b.view(race.now).stage, 'race');
  assert.equal(b.game.state, 'racing');
  await race.play(120000, { drive: { a: driver, b: slow }, until: () => b.view(race.now).stage === 'card' });
  assert.equal(b.game.state, 'finished');
  assert.equal(b.view(race.now).card.result, 'second');
});

test('a child who stops driving after the race is decided still gets the card in the end', async () => {
  const race = pair(channel({ delay: 30 }));
  const { a, b } = race.duels;
  await meet(race);
  await race.play(120000, { drive: { a: driver, b: idle }, until: () => phase(b) === 'over' });
  await race.play(30000, { drive: { a: driver, b: idle }, until: () => b.view(race.now).stage === 'card' });
  assert.equal(b.view(race.now).card.result, 'second');
});

test('the two vehicles start side by side, one on each side of the road', async () => {
  const race = pair(channel({ delay: 30 }));
  const { a, b } = race.duels;
  await meet(race);
  assert.ok(Math.abs(a.game.player.x) > 0.5);
  assert.equal(a.game.player.x, -b.game.player.x);
});
