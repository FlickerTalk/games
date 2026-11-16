import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readOpening, createOpening, playsTogether } from '../src/opening.js';

const CHAT = 'aB3_-xYz09aB3_-xYz09aB3_-xYz09aB3_-xYz09aB3';

function fakeApp() {
  const handlers = [];
  return { onOpen: (handler) => handlers.push(handler), open: (said) => handlers.forEach((handler) => handler(said)), handlers };
}

test('the conversation, solo and the language are taken as the app sends them', () => {
  assert.deepEqual(readOpening({ solo: true, chat: CHAT, lang: 'es', live: false }), { solo: true, chat: CHAT, lang: 'es', live: false });
  assert.deepEqual(readOpening({ lang: 'en', live: true }), { solo: false, chat: null, lang: 'en', live: true });
  assert.deepEqual(readOpening(undefined), { solo: false, chat: null, lang: null, live: false });
});

test('a chat that is not a plain id of at most 43 characters is ignored', () => {
  for (const chat of ['', `${CHAT}x`, '../other', 'a/b', 'a b', 'ñ', 42, null, {}]) {
    assert.equal(readOpening({ chat }).chat, null, String(chat));
  }
  assert.equal(readOpening({ chat: 'x' }).chat, 'x');
});

test('solo is only ever the value true', () => {
  for (const solo of ['true', 1, {}, null]) assert.equal(readOpening({ solo }).solo, false, String(solo));
});

test('with the app present the game waits for the opening, briefly at most', async () => {
  const app = fakeApp();
  const opening = createOpening();
  opening.listen(app);
  assert.equal(app.handlers.length, 1);
  const waiting = opening.whenOpened({ waitMs: 1000 });
  app.open({ chat: CHAT, solo: true, lang: 'fr' });
  assert.deepEqual(await waiting, { solo: true, chat: CHAT, lang: 'fr', live: false });
  assert.deepEqual(opening.current, { solo: true, chat: CHAT, lang: 'fr', live: false });
  const silent = createOpening();
  silent.listen(fakeApp());
  assert.deepEqual(await silent.whenOpened({ waitMs: 10 }), { solo: false, chat: null, lang: null, live: false });
});

test('without the app, or once opened, nothing is waited for', async () => {
  const alone = createOpening();
  alone.listen(undefined);
  assert.deepEqual(await alone.whenOpened({ waitMs: 60000 }), { solo: false, chat: null, lang: null, live: false });
  const app = fakeApp();
  const early = createOpening();
  early.listen(app);
  app.open({ chat: 'x' });
  assert.equal((await early.whenOpened({ waitMs: 60000 })).chat, 'x');
});

test('two people race only in a conversation with a contact that has the live channel, never in the FlickerTalk conversation', () => {
  assert.equal(playsTogether(readOpening({ chat: CHAT, live: true })), true);
  assert.equal(playsTogether(readOpening({ chat: CHAT, live: true, solo: true })), false);
  assert.equal(playsTogether(readOpening({ chat: CHAT, solo: true, live: false })), false);
  assert.equal(playsTogether(readOpening({ chat: CHAT })), false);
  assert.equal(playsTogether(readOpening({ live: true })), false);
  assert.equal(playsTogether(readOpening(undefined)), false);
  assert.equal(readOpening({ live: 'yes' }).live, false);
});
