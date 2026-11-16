import { test, afterEach } from 'vitest';
import assert from 'node:assert/strict';
import { oklchOf, softStage } from '../../../kit/src/canvas/tone.js';
import { themeFromTokens } from '../../../kit/src/canvas/theme.js';
import { APP_THEMES, setHostTheme, tokensFor } from '../../../kit/test/canvas/themes.js';
import { DAY_THEME, PALETTE } from '../src/art-palette.js';
import { pageTheme, switchColours, themeFor } from '../src/theme.js';

const NAMES = Object.keys(APP_THEMES);
const modeOf = (name) => ({ dark: name.endsWith('-dark') });

afterEach(() => setHostTheme(document.documentElement, null));

test('on a dark page every ground goes down to dusk, in every theme of the app, the way the kit games do it', () => {
  for (const name of NAMES.filter((one) => one.endsWith('-dark'))) {
    const { ground } = themeFor(tokensFor(name), modeOf(name));
    assert.deepEqual(ground, softStage(DAY_THEME.ground, { dark: true }), name);
    for (const [key, colour] of Object.entries(ground)) assert.ok(oklchOf(colour).l <= 0.58, `${name} ${key} ${colour}`);
  }
});

test('on a light page the ground keeps its day colours, only the brightest softened as in the kit games', () => {
  const { ground } = themeFor(tokensFor('mono-light'), { dark: false });
  assert.deepEqual(ground, softStage(DAY_THEME.ground, { dark: false }));
  assert.equal(ground.meadow, PALETTE.meadow);
  assert.ok(oklchOf(ground.sky).l < oklchOf(PALETTE.sky).l);
});

test('the score strip, the cards and the switches take the app\'s colours, edged in its border on a dark page', () => {
  for (const name of NAMES) {
    const ui = themeFromTokens(tokensFor(name), modeOf(name));
    const { hud } = themeFor(tokensFor(name), modeOf(name));
    assert.deepEqual(hud, {
      strip: ui.surface,
      card: ui.surface,
      edge: ui.dark ? ui.border : PALETTE.ink,
      text: ui.text,
      track: ui.track,
      off: ui.surface2,
      offText: ui.muted,
    }, name);
  }
});

test('it reads the page as the kit\'s canvas games do, from the app\'s colour variables and its dark mark', () => {
  const root = document.documentElement;
  setHostTheme(root, 'ember-dark');
  assert.equal(pageTheme(root), themeFor(tokensFor('ember-dark'), { dark: true }));
  setHostTheme(root, 'aurora-light');
  assert.equal(pageTheme(root), themeFor(tokensFor('aurora-light'), { dark: false }));
  setHostTheme(root, null);
  assert.equal(pageTheme(root).ui.dark, false);
});

test('the same colours always give the same frozen theme', () => {
  const theme = themeFor(tokensFor('lime-dark'), { dark: true });
  assert.equal(themeFor(tokensFor('lime-dark'), { dark: true }), theme);
  for (const part of [theme, theme.ground, theme.hud, theme.ui]) assert.ok(Object.isFrozen(part));
});

test('the switches get the theme as CSS variables', () => {
  const theme = themeFor(tokensFor('mono-dark'), { dark: true });
  assert.deepEqual(switchColours(theme), {
    '--racer-sky': theme.ground.sky,
    '--racer-panel': theme.hud.strip,
    '--racer-edge': theme.hud.edge,
    '--racer-text': theme.hud.text,
    '--racer-off': theme.hud.off,
    '--racer-off-text': theme.hud.offText,
  });
});
