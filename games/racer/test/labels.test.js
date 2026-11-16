import { test } from 'vitest';
import assert from 'node:assert/strict';
import { TEXTS } from '../src/texts.js';
import { startLabel, switchLabels } from '../src/labels.js';

test('the go label names the level in the reader\'s language', () => {
  assert.equal(startLabel('en', 12), 'Start level 12');
  assert.equal(startLabel('es', 3), 'Empezar el nivel 3');
  assert.ok(startLabel('bn', 3).includes('৩'));
  assert.equal(startLabel('ar-EG', 3), TEXTS.ar.start.replace('{level}', '٣'));
});

test('a regional language uses its base language, and an unknown one English', () => {
  assert.equal(startLabel('es-MX', 2), startLabel('es', 2));
  assert.equal(startLabel('pt-BR', 2), startLabel('pt', 2));
  assert.equal(startLabel('zh-TW', 2), TEXTS['zh-TW'].start.replace('{level}', '2'));
  assert.equal(startLabel('xx', 2), 'Start level 2');
  assert.equal(startLabel(undefined, 2), 'Start level 2');
});

test('the sound and music buttons and the volume line are named in the reader\'s language', () => {
  assert.deepEqual(switchLabels('en'), { sound: 'Sound', music: 'Music', volume: 'Volume' });
  assert.deepEqual(switchLabels('es-MX'), { sound: 'Sonido', music: 'Música', volume: 'Volumen' });
  assert.deepEqual(switchLabels('xx'), switchLabels('en'));
  for (const lang of Object.keys(TEXTS)) assert.ok(switchLabels(lang).sound && switchLabels(lang).music && switchLabels(lang).volume, lang);
});
