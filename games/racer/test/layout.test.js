import { test } from 'vitest';
import assert from 'node:assert/strict';
import { stageFor, MAX_STAGE_WIDTH, soundSwitchPlaces, SWITCH_ROOM, SWITCH_BAND } from '../src/layout.js';

test('a phone-shaped area is used whole', () => {
  assert.deepEqual(stageFor({ width: 384, height: 760 }), { x: 0, width: 384, height: 760 });
  assert.deepEqual(stageFor({ width: 360, height: 560 }), { x: 0, width: 360, height: 560 });
});

test('a wide area gets a portrait stage in the middle, as tall as the area', () => {
  const stage = stageFor({ width: 1248, height: 700 });
  assert.ok(stage.width < stage.height);
  assert.equal(stage.height, 700);
  assert.ok(Math.abs(stage.x + stage.width / 2 - 624) <= 0.5);
});

test('the stage is never wider than the area nor than its own limit', () => {
  assert.equal(stageFor({ width: 300, height: 900 }).width, 300);
  assert.equal(stageFor({ width: 2560, height: 1600 }).width, MAX_STAGE_WIDTH);
});

test('an area with no size yet gives an empty stage instead of failing', () => {
  assert.deepEqual(stageFor({ width: 0, height: 0 }), { x: 0, width: 0, height: 0 });
});

test('the sound and music switches sit in the top corners of the stage, at least 44 px, clear of the edges', () => {
  for (const area of [{ width: 360, height: 640 }, { width: 1248, height: 700 }]) {
    const stage = stageFor(area);
    const { sound, music } = soundSwitchPlaces(area);
    for (const place of [sound, music]) {
      assert.ok(place.size >= 44);
      assert.ok(place.y >= 6 && place.y <= 12);
    }
    assert.ok(sound.x >= stage.x + 6 && sound.x <= stage.x + 12);
    assert.ok(music.x + music.size <= stage.x + stage.width - 6 && music.x + music.size >= stage.x + stage.width - 12);
    assert.ok(SWITCH_ROOM >= sound.x - stage.x + sound.size);
  }
});

test('the volume line drops down under the speaker, thick enough for a finger, about 200 px long, beside the road and inside the area', () => {
  for (const area of [{ width: 360, height: 640 }, { width: 360, height: 343 }, { width: 1248, height: 700 }]) {
    const stage = stageFor(area);
    const { sound, volume } = soundSwitchPlaces(area);
    assert.equal(volume.x, sound.x);
    assert.ok(volume.y >= sound.y + sound.size);
    assert.ok(volume.width >= 44 && volume.x + volume.width <= stage.x + SWITCH_ROOM);
    assert.ok(volume.length >= 180 && volume.length <= 220, `${volume.length}`);
    assert.ok(volume.y + volume.length <= area.height - 6);
  }
});

test('the band the buttons take at the top is a button tall with its margins', () => {
  const { sound } = soundSwitchPlaces({ width: 360, height: 640 });
  assert.ok(SWITCH_BAND >= sound.y + sound.size && SWITCH_BAND <= sound.y + sound.size + 10);
});
