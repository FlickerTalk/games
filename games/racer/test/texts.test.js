import { test } from 'vitest';
import assert from 'node:assert/strict';
import { TEXTS } from '../src/texts.js';

const LANGUAGES = ['ar', 'bn', 'de', 'en', 'es', 'fr', 'hi', 'id', 'it', 'ja', 'ko', 'pl', 'pt', 'ro', 'ru', 'th', 'tr', 'uk', 'vi', 'zh-CN', 'zh-TW'];

test('the texts come in the 21 languages of the app, with the same keys and gaps', () => {
  assert.deepEqual(Object.keys(TEXTS).sort(), [...LANGUAGES].sort());
  const keys = Object.keys(TEXTS.en).sort();
  for (const lang of LANGUAGES) {
    assert.deepEqual(Object.keys(TEXTS[lang]).sort(), keys, lang);
    for (const key of keys) {
      assert.equal(typeof TEXTS[lang][key], 'string', `${lang}.${key}`);
      assert.ok(TEXTS[lang][key].trim().length > 0, `${lang}.${key}`);
      assert.deepEqual(TEXTS[lang][key].match(/\{\w+\}/g), TEXTS.en[key].match(/\{\w+\}/g), `${lang}.${key}`);
    }
  }
});

test('each language says it in its own words', () => {
  const translated = LANGUAGES.filter((lang) => lang !== 'en' && TEXTS[lang].start !== TEXTS.en.start);
  assert.equal(translated.length, 20);
});
