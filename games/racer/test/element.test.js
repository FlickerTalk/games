import { test, beforeEach, afterEach, vi } from 'vitest';
import assert from 'node:assert/strict';
import '../src/index.js';
import { stageFor } from '../src/layout.js';

class FakeObserver {
  static made = [];

  constructor(callback) {
    this.callback = callback;
    this.observed = [];
    this.disconnected = false;
    FakeObserver.made.push(this);
  }

  observe(target) {
    this.observed.push(target);
  }

  disconnect() {
    this.disconnected = true;
  }

  report(width, height) {
    this.callback([{ target: this.observed[0], contentRect: { width, height } }]);
  }
}

class FakeMutation {
  static made = [];

  constructor(callback) {
    this.callback = callback;
    this.watched = [];
    this.disconnected = false;
    FakeMutation.made.push(this);
  }

  observe(target, options) {
    this.watched.push({ target, options });
  }

  disconnect() {
    this.disconnected = true;
  }

  fire() {
    this.callback([]);
  }
}

const quietContext = new Proxy({ measureText: () => ({ width: 0 }) }, {
  get: (target, name) => (name in target ? target[name] : () => {}),
  set: (target, name, value) => {
    target[name] = value;
    return true;
  },
});

let frames;

beforeEach(() => {
  FakeObserver.made = [];
  FakeMutation.made = [];
  frames = [];
  vi.stubGlobal('ResizeObserver', FakeObserver);
  vi.stubGlobal('MutationObserver', FakeMutation);
  vi.stubGlobal('screen', { width: 360, height: 640 });
  document.documentElement.setAttribute('data-fill', '1');
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback) => frames.push(callback)));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(quietContext);
  document.body.replaceChildren();
  document.head.replaceChildren();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const runFrame = (now) => frames.splice(0).forEach((callback) => callback(now));

async function connected(setUp = () => {}) {
  const racer = document.createElement('ft-racer');
  setUp(racer);
  document.body.append(racer);
  await racer.session.ready;
  return racer;
}

test('connecting builds a canvas and a labelled go button, and the style goes in once', async () => {
  const racer = await connected();
  await connected();
  runFrame(1000);
  assert.ok(racer.querySelector('canvas'));
  const go = racer.querySelector('button.go');
  assert.equal(go.getAttribute('type'), 'button');
  assert.equal(go.getAttribute('aria-label'), 'Start level 1');
  assert.equal(document.head.querySelectorAll('style[data-ft-racer]').length, 1);
});

test('the game is sized from the element that holds it', async () => {
  vi.stubGlobal('devicePixelRatio', 2);
  const racer = await connected();
  const canvas = racer.querySelector('canvas');
  FakeObserver.made[0].report(1248, 700);
  runFrame(1000);
  assert.equal(canvas.width, 2496);
  assert.equal(canvas.height, 1400);
  const stage = stageFor({ width: 1248, height: 700 });
  const left = parseFloat(racer.querySelector('button.go').style.left);
  assert.ok(left > stage.x && left < stage.x + stage.width, `${left}`);
  FakeObserver.made[0].report(384, 760);
  assert.equal(canvas.width, 768);
  assert.equal(FakeObserver.made[0].observed[0], racer);
});

test('disconnecting lets go of the frame, the observer and every listener', async () => {
  const added = new Map();
  const count = (type, step) => added.set(type, (added.get(type) ?? 0) + step);
  for (const target of [window, document]) {
    const add = target.addEventListener.bind(target);
    const remove = target.removeEventListener.bind(target);
    vi.spyOn(target, 'addEventListener').mockImplementation((type, ...rest) => {
      count(type, 1);
      add(type, ...rest);
    });
    vi.spyOn(target, 'removeEventListener').mockImplementation((type, ...rest) => {
      count(type, -1);
      remove(type, ...rest);
    });
  }
  const racer = await connected();
  assert.ok((added.get('keydown') ?? 0) > 0);
  assert.ok((added.get('visibilitychange') ?? 0) > 0);
  racer.remove();
  assert.equal(FakeObserver.made[0].disconnected, true);
  assert.equal(FakeMutation.made[0].disconnected, true);
  assert.ok(cancelAnimationFrame.mock.calls.length > 0);
  for (const [type, left] of added) assert.equal(left, 0, type);
});

test('options set on the element before it connects pick the road and the level', async () => {
  const racer = await connected((element) => {
    element.racerOptions = { seed: 9, level: 3 };
  });
  assert.equal(racer.session.game.level, 3);
  assert.equal(racer.session.game.seed, 9);
});

test('with the app present, the race starts at the best level in its store', async () => {
  vi.stubGlobal('ft', { store: { get: async () => '5', set: async () => true } });
  const racer = await connected();
  assert.equal(racer.session.game.level, 5);
});

test('a long press on the game opens no menu', async () => {
  const racer = await connected();
  const press = new Event('contextmenu', { cancelable: true });
  racer.querySelector('canvas').dispatchEvent(press);
  assert.equal(press.defaultPrevented, true);
});

function room() {
  document.documentElement.removeAttribute('data-fill');
}

function fullScreen(on) {
  if (on) document.documentElement.setAttribute('data-fill', '1');
  else room();
  FakeMutation.made[0].fire();
}

test('in a conversation the element takes the room height, and full screen the whole frame, live both ways', async () => {
  room();
  const racer = await connected();
  FakeObserver.made[0].report(360, 0);
  assert.equal(racer.style.height, '343px');
  const { target, options } = FakeMutation.made[0].watched[0];
  assert.equal(target, document.documentElement);
  assert.deepEqual(options.attributeFilter, ['data-fill']);
  fullScreen(true);
  assert.equal(racer.style.height, '');
  fullScreen(false);
  assert.equal(racer.style.height, '343px');
});

test('a race goes on across a switch to full screen and back, with the car where it was', async () => {
  room();
  const racer = await connected((element) => {
    element.racerOptions = { seed: 3 };
  });
  const canvas = racer.querySelector('canvas');
  const observer = FakeObserver.made[0];
  observer.report(360, 343);
  let now = 1000;
  const play = (seconds) => {
    for (let elapsed = 0; elapsed < seconds; elapsed += 0.016) {
      now += 16;
      runFrame(now);
    }
  };
  play(0.05);
  racer.querySelector('button.go').click();
  window.dispatchEvent(Object.assign(new Event('keydown'), { key: 'ArrowUp' }));
  play(3);
  for (const [on, height] of [[true, 588], [false, 343]]) {
    const { game } = racer.session;
    const before = { ...game.player, level: game.level };
    fullScreen(on);
    observer.report(360, height);
    play(0.016);
    assert.equal(canvas.height, height);
    assert.equal(game.state, 'racing');
    assert.equal(game.level, before.level);
    assert.equal(game.player.x, before.x);
    assert.ok(game.player.speed >= before.speed);
    assert.ok(game.player.distance > before.distance && game.player.distance < before.distance + 0.5);
  }
});

test('the element carries a sound switch and a music switch, labelled, in the top corners of the stage', async () => {
  const racer = await connected();
  FakeObserver.made[0].report(1248, 700);
  runFrame(1000);
  const [sound, music] = racer.querySelectorAll('button.sound-switch');
  assert.ok(sound.classList.contains('sound') && music.classList.contains('music'));
  assert.equal(sound.getAttribute('aria-label'), 'Sound');
  assert.equal(music.getAttribute('aria-label'), 'Music');
  const stage = stageFor({ width: 1248, height: 700 });
  assert.ok(parseFloat(sound.style.left) > stage.x && parseFloat(sound.style.left) < stage.x + 20);
  assert.ok(parseFloat(music.style.left) > stage.x + stage.width - 60);
  const line = racer.querySelector('.volume-pop input.volume');
  assert.equal(line.getAttribute('aria-label'), 'Volume');
  assert.equal(line.closest('.volume-pop').hidden, true);
});
