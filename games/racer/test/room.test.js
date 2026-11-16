import { test } from 'vitest';
import assert from 'node:assert/strict';
import { roomHeight as kitRoomHeight } from '../../../kit/src/canvas/element.js';
import { roomHeight } from '../src/room.js';

test('in a conversation the game is exactly as tall as every canvas kit game, on any screen', () => {
  for (const screenHeight of [undefined, 0, 400, 597, 640, 844, 853, 932, 1280, 1397, 3000]) {
    assert.equal(roomHeight(screenHeight), kitRoomHeight(screenHeight), `${screenHeight}`);
  }
});
