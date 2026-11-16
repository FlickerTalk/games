import { createSound } from './sound.js';
import { createCueWatcher } from './sound-watch.js';
import { engineTone } from './sound-engine-tone.js';
import { saveSoundSettings, MUSIC_ON_BY_DEFAULT } from './sound-settings.js';
import { DEFAULT_VOLUME, volumeGain } from './sound-volume.js';
import { paintSwitches, labelSwitches, placeSwitches } from './sound-switches.js';
import { switchLabels } from './labels.js';
import { soundSwitchPlaces } from './layout.js';
import { attachVolume, foldIdleLine } from './session-volume.js';

const RACE_SCENES = new Set(['countdown', 'racing', 'finished', 'paused']);
const ENGINE_SCENES = new Set(['countdown', 'racing', 'finished']);
const GESTURES = ['pointerdown', 'pointerup', 'keydown', 'click'];

const gameOf = (run) => (run.duel ? run.duel.game : run.game);
const awake = (run, scene) => run.page.visibilityState !== 'hidden' && scene !== 'paused';

function sceneOf(run) {
  if (run.screen) return run.screen.name;
  if (run.duel) {
    if (!run.duelView) return 'none';
    return run.duelView.stage === 'card' ? 'card' : run.duelView.game.state;
  }
  if (!run.game) return 'none';
  return run.game.state === 'ready' ? 'card' : run.game.state;
}

function leadOf(run, game) {
  const other = game.robot ?? run.duelView?.rival;
  return other ? game.player.distance - other.distance : null;
}

function snapshotOf(run) {
  const game = gameOf(run);
  const { screen, profile } = run;
  return {
    scene: sceneOf(run),
    result: run.duel ? run.duelView?.card?.result ?? 'start' : game?.lastResult ?? 'start',
    countdown: game?.state === 'countdown' ? { timer: game.timer, length: game.countdownLength } : null,
    crossed: Boolean(game) && game.player.distance >= game.track.length,
    lead: game ? leadOf(run, game) : null,
    time: run.seconds,
    moments: game?.moments ?? [],
    garage: screen?.name === 'garage' ? { kind: profile.kind, color: profile.color, page: screen.page, nudgeAt: screen.nudge?.startedAt ?? null } : null,
  };
}

function engineFor(game, scene) {
  if (!game || !ENGINE_SCENES.has(scene)) return null;
  return engineTone({ share: game.player.speed / game.settings.topSpeed, pressing: Boolean(game.player.pressing) });
}

function paint(run) {
  if (run.switches) paintSwitches(run.switches, run.soundSettings, { open: run.volumeLine?.open ?? false });
}

export function applySoundSettings(run, settings) {
  run.soundSettings = settings;
  run.sound.setVolume(volumeGain(settings.volume));
  run.sound.setMusicOn(settings.music);
  paint(run);
}

function choose(run, change) {
  run.soundChosen = true;
  applySoundSettings(run, { ...run.soundSettings, ...change });
}

export function keepSoundSettings(run, settings) {
  if (!run.soundChosen) applySoundSettings(run, settings);
}

export function attachSound(run, { sound, switches, app }) {
  Object.assign(run, {
    sound: sound ?? createSound(), switches: switches ?? null, hearCues: createCueWatcher(),
    soundSettings: { volume: DEFAULT_VOLUME, music: MUSIC_ON_BY_DEFAULT }, soundChosen: false,
  });
  const unlock = () => {
    // Browsers only let audio start from inside a real touch or key press.
    if (globalThis.navigator?.userActivation?.isActive !== false) run.sound.unlock();
  };
  const onVisibility = () => run.sound.setAwake(awake(run, sceneOf(run)));
  const actions = { unlock, choose: (change) => choose(run, change), save: () => saveSoundSettings(run.store, run.soundSettings), paint: () => paint(run) };
  const unhearVolume = switches ? attachVolume(run, switches, actions) : () => {};
  for (const type of GESTURES) run.page.addEventListener(type, unlock, true);
  run.page.addEventListener('visibilitychange', onVisibility);
  app?.onClose?.(() => run.sound.close());
  paint(run);
  return () => {
    for (const type of GESTURES) run.page.removeEventListener(type, unlock, true);
    run.page.removeEventListener('visibilitychange', onVisibility);
    unhearVolume();
    run.sound.close();
  };
}

export function syncSound(run) {
  const snapshot = snapshotOf(run);
  run.sound.setAwake(awake(run, snapshot.scene));
  run.sound.song(RACE_SCENES.has(snapshot.scene) ? 'race' : 'calm');
  for (const cue of run.hearCues(snapshot)) run.sound.cue(cue);
  run.sound.engine(engineFor(gameOf(run), snapshot.scene));
  run.sound.tick();
  if (!run.switches) return;
  foldIdleLine(run, () => paint(run));
  labelSwitches(run.switches, switchLabels(run.page.documentElement?.lang));
}

export function placeSoundSwitches(run, area) {
  if (run.switches) placeSwitches(run.switches, soundSwitchPlaces(area));
}
