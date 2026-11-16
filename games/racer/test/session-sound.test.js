import { test } from 'vitest';
import assert from 'node:assert/strict';
import { setUp } from './session-harness.js';
import { soundRecorder } from './sound-recorder.js';

const key = (target, type, name) => target.dispatchEvent(Object.assign(new Event(type), { key: name }));

async function racing(extra = {}) {
  const sound = soundRecorder();
  const run = await setUp({ sound, ...extra });
  return { ...run, sound, heard: sound.heard };
}

test('the card plays the calm song, and going counts down with two ticks and a go while the race song takes over', async () => {
  const { goButton, play, heard } = await racing();
  play(0.05);
  assert.equal(heard.songs.at(-1), 'calm');
  assert.deepEqual(heard.cues, []);
  goButton.click();
  play(1.7);
  assert.deepEqual(heard.cues, ['tick', 'tick', 'go']);
  assert.equal(heard.songs.at(-1), 'race');
  assert.ok(heard.ticks > 50);
});

test('the engine is quiet on the card and follows the speed while driving', async () => {
  const { goButton, keyTarget, play, heard } = await racing();
  play(0.05);
  assert.equal(heard.engine.at(-1), null);
  goButton.click();
  play(1.6);
  const idle = heard.engine.at(-1);
  key(keyTarget, 'keydown', 'ArrowUp');
  play(1.5);
  const moving = heard.engine.at(-1);
  assert.ok(idle && moving);
  assert.ok(moving.frequency > idle.frequency && moving.gain > idle.gain);
});

test('a cone in the way bumps, once', async () => {
  const { session, goButton, keyTarget, play, heard } = await racing();
  goButton.click();
  play(1.6);
  const { game } = session;
  const cone = game.track.hazards.find((thing) => thing.kind === 'cone');
  Object.assign(game.player, { x: cone.x, distance: cone.distance - 0.6 });
  key(keyTarget, 'keydown', 'ArrowUp');
  play(0.5);
  assert.deepEqual(heard.cues.filter((cue) => cue === 'bump'), ['bump']);
});

test('crossing the line first chimes, then the card plays the win tune', async () => {
  const { session, goButton, keyTarget, play, heard } = await racing();
  goButton.click();
  play(1.6);
  session.game.player.distance = session.game.track.length - 0.05;
  key(keyTarget, 'keydown', 'ArrowUp');
  play(0.2);
  assert.equal(heard.cues.at(-1), 'finish');
  play(1.4);
  assert.equal(heard.cues.at(-1), 'win');
  assert.equal(heard.songs.at(-1), 'calm');
});

test('the robot winning brings the friendly two notes, and no finish chime', async () => {
  const { session, goButton, play, heard } = await racing();
  goButton.click();
  play(1.6);
  session.game.robot.distance = session.game.track.length - 0.05;
  play(1.6);
  assert.ok(!heard.cues.includes('finish'));
  assert.equal(heard.cues.at(-1), 'lose');
});

test('a hidden page or a paused race puts the sound to sleep, and the press that resumes it wakes it', async () => {
  const { goButton, page, canvas, play, heard } = await racing();
  goButton.click();
  play(2.5);
  assert.equal(heard.awake.at(-1), true);
  page.visibilityState = 'hidden';
  page.dispatchEvent(new Event('visibilitychange'));
  assert.equal(heard.awake.at(-1), false);
  page.visibilityState = 'visible';
  page.dispatchEvent(new Event('visibilitychange'));
  play(0.5);
  assert.equal(heard.awake.at(-1), false);
  canvas.dispatchEvent(Object.assign(new Event('pointerdown'), { pointerId: 1, clientX: 150 }));
  play(0.05);
  assert.equal(heard.awake.at(-1), true);
});

test('nothing unlocks the sound until the player touches or presses a key', async () => {
  const { page, play, heard } = await racing();
  play(0.5);
  assert.equal(heard.unlocks, 0);
  page.dispatchEvent(new Event('pointerup'));
  page.dispatchEvent(new Event('keydown'));
  assert.equal(heard.unlocks, 2);
});

test('letting the session go closes the sound', async () => {
  const { session, heard } = await racing();
  session.destroy();
  assert.equal(heard.closed, true);
});

test('when the app closes the game the sound is closed at once', async () => {
  const closing = [];
  const app = { onClose: (handler) => closing.push(handler) };
  const { heard } = await racing({ app });
  assert.equal(closing.length, 1);
  closing[0]();
  assert.equal(heard.closed, true);
});
