import { test } from 'vitest';
import assert from 'node:assert/strict';
import { sealAbout, openAbout, kindOf, checkState, duelLevel, seedOf, DUEL } from '../src/duel-wire.js';
import { sealLive } from '../../../kit/src/live/wire.js';

const DOC = 'race0123456789abcdef';
const WHO = 'who0123456789abcdefg';

test('a player tells the other their vehicle and best level, and only that comes through', () => {
  const data = sealAbout({ doc: DOC, who: WHO, best: 7, kind: 'rocket', color: 'mint' });
  assert.deepEqual(openAbout(data), { doc: DOC, who: WHO, best: 7, kind: 'rocket', color: 'mint' });
  assert.equal(openAbout(sealAbout({ doc: DOC, who: WHO, best: 7, kind: 'spaceship', color: 'plaid' })).kind, 'car');
  assert.equal(openAbout(sealAbout({ doc: DOC, who: WHO, best: -3, kind: 'bus', color: 'mint' })).best, 1);
  for (const junk of ['', 'not base64!', 42, null, sealLive({ g: DUEL.g, gv: DUEL.gv, k: 'hello', doc: DOC, who: WHO, ready: true, app: '0.6.0' })]) {
    assert.equal(openAbout(junk), null);
  }
});

test('the kind of a message the race session sends can be read, so the vehicle can go with every hello', () => {
  assert.equal(kindOf(sealLive({ g: DUEL.g, gv: DUEL.gv, k: 'hello', doc: DOC, who: WHO, ready: true, app: '0.6.0' })), 'hello');
  assert.equal(kindOf(sealLive({ g: DUEL.g, gv: DUEL.gv, k: 'tick', doc: DOC, who: WHO, t: 5, s: { d: 1, x: 0, v: 2, k: 'car', c: 'ocean' } })), 'tick');
  assert.equal(kindOf('junk'), null);
});

test('only a sensible state of the other vehicle is taken', () => {
  const good = { d: 120.5, x: -1.2, v: 9, k: 'bus', c: 'ocean', b: 1 };
  assert.deepEqual(checkState(good), good);
  assert.deepEqual(checkState({ ...good, k: 'ufo', c: 'plaid', b: 7 }), { ...good, k: 'car', c: 'sunshine', b: 0 });
  for (const bad of [null, {}, { ...good, d: -1 }, { ...good, d: 1e7 }, { ...good, x: 9 }, { ...good, v: Infinity }, { ...good, d: '3' }]) {
    assert.equal(checkState(bad), null, JSON.stringify(bad));
  }
});

test('both phones pick the same race: the lower best level, never past the plateau, with scenery from the race id', () => {
  assert.equal(duelLevel({ mine: 3, theirs: 9, seed: 5 }), 3);
  assert.equal(duelLevel({ mine: 9, theirs: 2, seed: 5 }), 2);
  const high = new Set();
  for (let seed = 1; seed < 40; seed += 1) high.add(duelLevel({ mine: 30, theirs: 12, seed }));
  assert.deepEqual([...high].sort((a, b) => a - b), [6, 7, 8, 9]);
  assert.equal(duelLevel({ mine: 30, theirs: 12, seed: 8 }), duelLevel({ mine: 12, theirs: 30, seed: 8 }));
  assert.equal(seedOf(DOC), seedOf(DOC));
  assert.notEqual(seedOf(DOC), seedOf(`${DOC}x`));
  assert.ok(Number.isInteger(seedOf(DOC)) && seedOf(DOC) > 0);
});
