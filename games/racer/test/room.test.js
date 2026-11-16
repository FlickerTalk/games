import { test } from 'vitest';
import assert from 'node:assert/strict';
import { roomHeight, ROOM_CHROME } from '../src/room.js';

test('in a conversation the game takes the screen less the room around it, as the other games do', () => {
  assert.equal(ROOM_CHROME, 297);
  assert.equal(roomHeight({ screenHeight: 640, width: 360 }), 343);
  assert.equal(roomHeight({ screenHeight: 800, width: 800 }), 503);
});

test('it is never taller than four thirds of its width, so the road stays readable', () => {
  assert.equal(roomHeight({ screenHeight: 844, width: 390 }), 520);
  assert.equal(roomHeight({ screenHeight: 1280, width: 300 }), 400);
});

test('it stays between a playable minimum and a sensible maximum', () => {
  assert.equal(roomHeight({ screenHeight: 400, width: 600 }), 240);
  assert.equal(roomHeight({ screenHeight: 2400, width: 1600 }), 1000);
});

test('it depends only on the screen and the width, never on its own height', () => {
  assert.equal(roomHeight({ screenHeight: undefined, width: 390 }), 520);
  assert.equal(roomHeight({ screenHeight: 640, width: 0 }), 343);
});
