import { createSession } from '../src/session.js';

export function quietCanvas() {
  const ctx = new Proxy({ measureText: () => ({ width: 0 }) }, {
    get: (target, name) => (name in target ? target[name] : () => {}),
    set: (target, name, value) => {
      target[name] = value;
      return true;
    },
  });
  return Object.assign(new EventTarget(), { width: 0, height: 0, getContext: () => ctx });
}

export function fakeFrames() {
  const pending = new Map();
  const cancelled = [];
  let next = 0;
  return {
    cancelled,
    pending,
    request(callback) {
      next += 1;
      pending.set(next, callback);
      return next;
    },
    cancel(id) {
      cancelled.push(id);
      pending.delete(id);
    },
    run(now) {
      const due = [...pending.values()];
      pending.clear();
      for (const callback of due) callback(now);
    },
  };
}

export function counted(target) {
  const listening = new Map();
  const add = target.addEventListener.bind(target);
  const remove = target.removeEventListener.bind(target);
  target.addEventListener = (type, ...rest) => {
    listening.set(type, (listening.get(type) ?? 0) + 1);
    add(type, ...rest);
  };
  target.removeEventListener = (type, ...rest) => {
    listening.set(type, (listening.get(type) ?? 0) - 1);
    remove(type, ...rest);
  };
  return listening;
}

export function memoryStore(values = {}) {
  const kept = new Map(Object.entries(values));
  const writes = [];
  return {
    writes,
    get: async (key) => (kept.has(key) ? kept.get(key) : null),
    set: async (key, value) => {
      writes.push([key, value]);
      kept.set(key, value);
      return true;
    },
  };
}

export async function setUp({ store = memoryStore(), options = { seed: 3 }, opening, app, sound, switches } = {}) {
  const canvas = quietCanvas();
  const goButton = document.createElement('button');
  const keyTarget = new EventTarget();
  const page = Object.assign(new EventTarget(), { visibilityState: 'visible', documentElement: { lang: 'en' } });
  const frames = fakeFrames();
  const session = createSession({ canvas, goButton, keyTarget, page, store, options, frames, opening, app, sound, switches });
  session.resize({ width: 384, height: 760, dpr: 1 });
  await session.ready;
  let now = 1000;
  const play = (seconds) => {
    for (let elapsed = 0; elapsed < seconds; elapsed += 0.016) {
      now += 16;
      frames.run(now);
    }
  };
  const later = (milliseconds) => {
    now += milliseconds;
    frames.run(now);
  };
  return { session, canvas, goButton, keyTarget, page, frames, store, play, later };
}
