import { createGame, pressGo, stepGame, pauseRace, resumeRace } from './game.js';
import { createRenderer } from './render.js';
import { createControls } from './controls.js';
import { createClock } from './clock.js';
import { clampToRoad } from './track.js';
import { stageFor } from './layout.js';
import { levelKey, loadLevel, saveLevel, loadProfile, saveProfile } from './progress.js';
import { noteLevel } from './profile.js';
import { goneLabel, startLabel } from './labels.js';
import { createOpening } from './opening.js';
import { tapScreen, noteWins, screenHud, vehicleOf } from './session-garage.js';
import { joinDuel, stepDuel, duelHud, duelCardUp, duelGoShown } from './session-duel.js';
import { attachSound, syncSound, placeSoundSwitches, keepSoundSettings } from './session-sound.js';
import { loadSoundSettings } from './sound-settings.js';

const GO_TARGET_MARGIN = 14;
const TOUCH_FADE_SECONDS = 0.45;
const NOTE_FONT = { most: 16, least: 11 };
const BROWSER_FRAMES = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (id) => cancelAnimationFrame(id),
};

const px = (value) => `${value}px`;
const randomSeed = () => Math.floor(Math.random() * 100000) + 1;

export function createSession(parts) {
  const { canvas, goButton, note = null, keyTarget, page, store, app, options = {}, frames = BROWSER_FRAMES, opening = createOpening(), sound, switches } = parts;
  const renderer = createRenderer(canvas);
  const run = {
    renderer, goButton, note, page, store, frames, clock: createClock(), opened: null, key: levelKey(null),
    game: null, best: 1, hintPending: true, hidden: page.visibilityState === 'hidden', pressesAtPause: 0, frame: null, alive: true,
    releasesSeen: 0, releasedAt: null, canvas, profile: null, screen: null, winsSeen: 0, seconds: 0, garageOpened: false,
    duel: null, duelView: null, nowMs: 0,
  };
  run.playRobot = () => begin(run, run.best, options);
  run.controls = createControls({
    eventTarget: keyTarget,
    surface: canvas,
    carX: () => currentGame(run)?.player.x ?? 0,
    clampX: (x) => (currentGame(run) ? clampToRoad(x, currentGame(run).player.width / 2) : x),
    toRoadUnits: (pixels) => pixels / (renderer.pixelsPerUnit() || 1),
  });
  const unwire = wire(run, keyTarget);
  const unhear = attachSound(run, { sound, switches, app });
  const ready = opening.whenOpened().then((opened) => {
    run.opened = opened;
    run.key = levelKey(opened.chat);
    return Promise.all([loadLevel(store, { key: run.key }), loadProfile(store), loadSoundSettings(store)]);
  }).then(([stored, profile, soundSettings]) => {
    keepSoundSettings(run, soundSettings);
    run.profile = profile;
    run.best = stored;
    joinDuel(run, app);
    if (!run.duel) begin(run, stored, options);
  });
  schedule(run);
  return {
    ready,
    renderer,
    controls: run.controls,
    hintShown: () => hintShown(run),
    touchAt: (seconds) => touchAt(run, seconds),
    get releasedAt() {
      return run.releasedAt;
    },
    get game() {
      return currentGame(run);
    },
    get duel() {
      return run.duel;
    },
    get opened() {
      return run.opened;
    },
    get profile() {
      return run.profile;
    },
    get screen() {
      return run.screen;
    },
    resize: (size) => resize(run, size),
    retheme: (theme) => run.renderer.retheme(theme),
    destroy: () => destroy(run, () => {
      unwire();
      unhear();
    }),
  };
}

function currentGame(run) {
  return run.duel ? run.duel.game : run.game;
}

function begin(run, stored, options) {
  if (!run.alive) return;
  run.best = stored;
  run.game = createGame({ level: options.level ?? stored, seed: options.seed ?? randomSeed() });
}

function pause(run) {
  run.clock.reset();
  if (run.duel || !run.game || run.game.state === 'paused') return;
  pauseRace(run.game);
  if (run.game.state === 'paused') run.pressesAtPause = run.controls.presses;
}

function wire(run, keyTarget) {
  const start = () => {
    if (run.screen || run.hidden) return run.goButton.blur();
    if (run.duel) {
      if (duelGoShown(run)) run.duel.start();
    } else if (run.game?.state === 'ready') pressGo(run.game);
    run.goButton.blur();
  };
  const onKey = (event) => {
    if (event.key === 'Enter' && !event.repeat) start();
  };
  const onVisibility = () => {
    run.hidden = run.page.visibilityState === 'hidden';
    if (run.hidden) {
      pause(run);
      run.duel?.away();
    }
    run.clock.reset();
  };
  const onTap = (event) => tapScreen(run, { x: event.offsetX, y: event.offsetY });
  run.canvas.addEventListener('click', onTap);
  run.goButton.addEventListener('click', start);
  keyTarget.addEventListener('keydown', onKey);
  run.page.addEventListener('visibilitychange', onVisibility);
  return () => {
    run.canvas.removeEventListener('click', onTap);
    run.goButton.removeEventListener('click', start);
    keyTarget.removeEventListener('keydown', onKey);
    run.page.removeEventListener('visibilitychange', onVisibility);
  };
}

function hintShown(run) {
  return run.hintPending && run.game?.level === 1;
}

function schedule(run) {
  run.frame = run.frames.request((now) => frame(run, now));
}

function noteTouch(run, seconds) {
  if (run.controls.releases === run.releasesSeen) return;
  run.releasesSeen = run.controls.releases;
  run.releasedAt = seconds;
}

function touchAt(run, seconds) {
  const touch = run.controls.touch;
  if (touch.pressed) return { ...touch, time: seconds };
  if (run.releasedAt === null || seconds - run.releasedAt >= TOUCH_FADE_SECONDS) return null;
  return { ...touch, time: seconds - run.releasedAt };
}

function frame(run, now) {
  run.frame = null;
  if (!run.alive) return;
  const seconds = now / 1000;
  const input = run.controls.read();
  const dt = run.clock.tick(now);
  noteTouch(run, seconds);
  run.seconds = seconds;
  run.nowMs = now;
  if (run.duel) stepDuel(run, input, now);
  else if (run.game && !run.hidden) advance(run, input, dt, seconds);
  syncGoButton(run);
  syncNote(run);
  syncSound(run);
  run.renderer.draw(currentGame(run), seconds, {
    hint: hintShown(run), touch: touchAt(run, seconds), vehicle: vehicleOf(run), screen: screenHud(run, seconds), garageHint: !run.garageOpened,
    ...(run.duel ? duelHud(run) : {}),
  });
  schedule(run);
}

function advance(run, input, dt, seconds) {
  const { game } = run;
  if (game.state === 'paused' && run.controls.presses > run.pressesAtPause) resumeRace(game);
  if (input.accelerate && game.state !== 'ready') run.hintPending = false;
  stepGame(game, input, dt);
  noteWins(run, seconds);
  if (game.level > run.best) {
    run.best = game.level;
    saveLevel(run.store, game.level, run.key);
  }
  if (noteLevel(run.profile, game.level)) saveProfile(run.store, run.profile);
}

function syncGoButton(run) {
  const waiting = !run.screen && (run.duel ? duelGoShown(run) : run.game?.state === 'ready');
  run.goButton.hidden = !waiting;
  if (!waiting) return;
  const label = startLabel(run.page.documentElement?.lang, run.duel ? run.duelView.card.level : run.game.level);
  if (run.goButton.getAttribute('aria-label') !== label) run.goButton.setAttribute('aria-label', label);
}

function syncNote(run) {
  const { note } = run;
  if (!note) return;
  const gone = Boolean(run.duel && !run.screen && duelCardUp(run) && run.duelView.card.rival.status === 'gone');
  if (note.hidden === gone) note.hidden = !gone;
  if (!gone) return;
  const text = goneLabel(run.page.documentElement?.lang);
  const box = run.renderer.noteBox();
  const key = `${text}|${box.x},${box.y},${box.width},${box.height}`;
  if (run.noted === key) return;
  run.noted = key;
  note.textContent = text;
  layOutNote(note, box);
}

function layOutNote(note, box) {
  Object.assign(note.style, { left: px(box.x), top: px(box.y), width: px(box.width), maxHeight: px(box.height) });
  let size = NOTE_FONT.most;
  note.style.fontSize = px(size);
  while (size > NOTE_FONT.least && note.scrollHeight > note.clientHeight + 1) note.style.fontSize = px((size -= 1));
  note.style.top = px(box.y + Math.max(0, (box.height - note.offsetHeight) / 2));
}

function resize(run, { width, height, dpr }) {
  run.renderer.resize({ width, height, dpr, stage: stageFor({ width, height }) });
  placeSoundSwitches(run, { width, height });
  const go = run.renderer.goButton();
  const margin = GO_TARGET_MARGIN;
  Object.assign(run.goButton.style, {
    left: px(go.x - margin), top: px(go.y - margin), width: px(go.width + margin * 2), height: px(go.height + margin * 2),
  });
}

function destroy(run, unwire) {
  run.alive = false;
  if (run.frame !== null) run.frames.cancel(run.frame);
  run.frame = null;
  run.controls.destroy();
  unwire();
}
