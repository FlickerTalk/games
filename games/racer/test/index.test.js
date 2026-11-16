import { test, vi } from 'vitest';
import assert from 'node:assert/strict';
import { defineRacer } from '../src/index.js';
import { RacerElement } from '../src/element.js';

test('loading the package defines ft-racer, and defining it again changes nothing', () => {
  assert.equal(customElements.get('ft-racer'), RacerElement);
  defineRacer();
  defineRacer();
  assert.equal(customElements.get('ft-racer'), RacerElement);
});

test('building the element sets no attributes on it', () => {
  assert.equal(document.createElement('ft-racer').attributes.length, 0);
});

test('loading the package listens for the app opening it, once', async () => {
  const onOpen = vi.fn();
  vi.stubGlobal('ft', { onOpen });
  vi.resetModules();
  await import('../src/index.js');
  assert.equal(onOpen.mock.calls.length, 1);
  vi.unstubAllGlobals();
});
