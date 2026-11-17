import { test } from 'vitest';
import assert from 'node:assert/strict';
import { setUp } from './session-harness.js';
import { PROFILE_KEY } from '../src/progress.js';
import { sealLive } from '../../../kit/src/live/wire.js';
import { DUEL, kindOf, openAbout } from '../src/duel-wire.js';
import { goneLabel } from '../src/labels.js';

const CHAT = 'aB3_-xYz09aB3_-xYz09aB3_-xYz09aB3_-xYz09aB3';
const opened = (said) => ({ whenOpened: async () => ({ solo: false, chat: null, lang: 'en', live: false, ...said }) });
const tap = (canvas, { x, y }) => canvas.dispatchEvent(Object.assign(new Event('click'), { offsetX: x, offsetY: y }));
const centre = (box) => ({ x: box.centerX, y: box.centerY });

function fakeApp({ answer = true } = {}) {
  const calls = { live: [], say: 0, send: 0 };
  const heard = [];
  const app = {
    calls,
    heard,
    live: {
      send: async (data) => {
        calls.live.push(data);
        return answer;
      },
      onMessage: (handler) => heard.push(handler),
    },
    say: () => {
      calls.say += 1;
    },
    send: () => {
      calls.send += 1;
    },
  };
  return app;
}

async function winSolo(opening, app) {
  const opened_ = await setUp({ opening, app });
  const { session, goButton, keyTarget, play } = opened_;
  goButton.click();
  play(1.6);
  session.game.player.distance = session.game.track.length - 0.05;
  keyTarget.dispatchEvent(Object.assign(new Event('keydown'), { key: 'ArrowUp' }));
  play(1.6);
  await Promise.resolve();
  return opened_;
}

test('in the FlickerTalk conversation the game races the robot and never uses the live channel, say or send', async () => {
  const app = fakeApp();
  const { session } = await winSolo(opened({ solo: true, live: true, chat: CHAT }), app);
  assert.equal(session.duel, null);
  assert.equal(session.game.level, 2);
  assert.deepEqual([app.calls.live.length, app.calls.say, app.calls.send], [0, 0, 0]);
});

test('opened with no conversation and no live channel it races the robot too', async () => {
  const app = fakeApp();
  const { session } = await winSolo(opened({}), app);
  assert.equal(session.duel, null);
  assert.equal(app.calls.live.length, 0);
});

test('in a contact\'s conversation it waits for the friend, and go calls them with the vehicle', async () => {
  const app = fakeApp();
  const { session, goButton, play } = await setUp({ opening: opened({ chat: CHAT, live: true }), app });
  play(0.05);
  assert.ok(session.duel);
  assert.equal(app.heard.length, 1);
  assert.equal(goButton.hidden, false);
  assert.equal(app.calls.live.length, 0);
  goButton.click();
  play(0.05);
  await Promise.resolve();
  assert.equal(openAbout(app.calls.live[0]).kind, 'car');
  assert.equal(app.calls.live.length, 2);
  assert.equal(goButton.hidden, true);
});

test('when the friend cannot be reached the robot button starts a race against the robot', async () => {
  const app = fakeApp({ answer: false });
  const { session, goButton, canvas, play } = await setUp({ opening: opened({ chat: CHAT, live: true }), app });
  play(0.05);
  goButton.click();
  play(0.05);
  for (let turn = 0; turn < 4; turn += 1) await null;
  play(0.05);
  assert.equal(session.duel.session.phase, 'left');
  tap(canvas, centre(session.renderer.robotButton()));
  play(0.05);
  assert.equal(session.duel, null);
  assert.equal(session.game.state, 'ready');
  assert.ok(session.game.robot);
  const sent = app.calls.live.length;
  goButton.click();
  play(2);
  assert.equal(app.calls.live.length, sent);
});

test('in a race with a friend a hidden page does not pause anything', async () => {
  const app = fakeApp();
  const { session, page, play } = await setUp({ opening: opened({ chat: CHAT, live: true }), app });
  play(0.05);
  page.visibilityState = 'hidden';
  page.dispatchEvent(new Event('visibilitychange'));
  play(0.1);
  assert.notEqual(session.duel.session.phase, 'paused');
  assert.equal(session.game, null);
});

test('in a race with a friend a hidden page leaves the race, and coming back shows the start card', async () => {
  const app = fakeApp();
  const { session, goButton, page, play } = await setUp({ opening: opened({ chat: CHAT, live: true }), app });
  play(0.05);
  goButton.click();
  play(0.05);
  await Promise.resolve();
  const live = session.duel.session;
  const friend = (k, fields) => sealLive({ g: DUEL.g, gv: DUEL.gv, k, doc: live.id, who: 'z'.repeat(16), ...fields });
  app.heard[0](friend('hello', { ready: true, re: true, app: '0.7.6' }));
  play(4);
  assert.equal(live.phase, 'running');
  page.visibilityState = 'hidden';
  page.dispatchEvent(new Event('visibilitychange'));
  assert.equal(live.phase, 'left');
  assert.equal(kindOf(app.calls.live.at(-1)), 'bye');
  page.visibilityState = 'visible';
  page.dispatchEvent(new Event('visibilitychange'));
  play(0.1);
  const { stage, card } = session.duel.view(0);
  assert.equal(stage, 'card');
  assert.deepEqual([card.result, card.rival.status], ['start', 'unknown']);
  assert.equal(goButton.hidden, false);
});

test('in a race with a friend who leaves, a line on the card says so until a new race is asked for', async () => {
  const app = fakeApp();
  const { session, goButton, note, play } = await setUp({ opening: opened({ chat: CHAT, live: true }), app });
  play(0.05);
  assert.equal(note.hidden, true);
  goButton.click();
  play(0.05);
  await Promise.resolve();
  const live = session.duel.session;
  const friend = (k, fields) => sealLive({ g: DUEL.g, gv: DUEL.gv, k, doc: live.id, who: 'z'.repeat(16), ...fields });
  app.heard[0](friend('hello', { ready: true, re: true, app: '0.7.7' }));
  play(4);
  assert.equal(note.hidden, true);
  app.heard[0](friend('bye'));
  play(0.1);
  assert.equal(note.hidden, false);
  assert.equal(note.textContent, goneLabel('en'));
  assert.ok(Number.parseFloat(note.style.width) > 0);
  goButton.click();
  play(0.1);
  assert.equal(note.hidden, true);
});

test('a level reached against the robot raises the player\'s top level, used for races with friends', async () => {
  const { store } = await winSolo(opened({}), undefined);
  const written = store.writes.filter(([name]) => name === PROFILE_KEY).map(([, value]) => JSON.parse(value).topLevel);
  assert.ok(written.includes(2));
});
