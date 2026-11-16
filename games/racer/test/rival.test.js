import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createRival, RIVAL } from '../src/rival.js';

const SPEED = 12;
const state = (t) => ({ d: (SPEED * t) / 1000, x: Math.sin(t / 700), v: SPEED, k: 'kart', c: 'mint', b: 0 });

function drive({ stallFrom = Infinity, stallTo = Infinity, until = 8000 }) {
  const rival = createRival();
  const shown = [];
  const held = [];
  for (let now = 0, sentAt = 0; now <= until; now += 16) {
    while (sentAt <= now) {
      held.push(sentAt);
      sentAt += 83;
    }
    const stalled = now >= stallFrom && now < stallTo;
    if (!stalled) held.splice(0).forEach((t) => rival.heard(state(t), t, now + 40));
    const seen = rival.at(now);
    if (seen) shown.push({ now, ...seen });
  }
  return shown;
}

test('the other vehicle is drawn close behind where it really is, with its own looks', () => {
  const shown = drive({});
  const last = shown.at(-1);
  assert.ok(Math.abs(last.distance - (SPEED * last.now) / 1000) < SPEED * 0.5, JSON.stringify(last));
  assert.deepEqual([last.kind, last.color, last.braking], ['kart', 'mint', false]);
});

test('after a stall and a burst the other vehicle never goes backwards and never jumps', () => {
  const shown = drive({ stallFrom: 2000, stallTo: 4500 });
  for (let i = 1; i < shown.length; i += 1) {
    const step = shown[i].distance - shown[i - 1].distance;
    const seconds = (shown[i].now - shown[i - 1].now) / 1000;
    assert.ok(step >= 0, `backwards by ${step} at ${shown[i].now}`);
    assert.ok(step <= (SPEED + RIVAL.catchUp) * seconds + 1e-9, `jumped ${step} at ${shown[i].now}`);
    assert.ok(Math.abs(shown[i].x - shown[i - 1].x) <= 6 * seconds + 0.05, `slid sideways at ${shown[i].now}`);
  }
  const caughtUp = shown.find((one) => one.now >= 7000);
  assert.ok(Math.abs(caughtUp.distance - (SPEED * caughtUp.now) / 1000) < SPEED * 0.5, JSON.stringify(caughtUp));
});

test('a state that arrives late or older than what was seen does not pull the vehicle back', () => {
  const rival = createRival();
  rival.heard(state(1000), 1000, 1000);
  rival.heard(state(1083), 1083, 1083);
  const before = rival.at(1200).distance;
  rival.heard({ ...state(1166), d: 2 }, 1166, 1166);
  rival.heard(state(900), 900, 1170);
  assert.ok(rival.at(1300).distance >= before);
  rival.reset();
  assert.equal(rival.at(1400), null);
});
