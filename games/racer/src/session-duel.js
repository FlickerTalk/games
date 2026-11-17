import { version } from '../module.json';
import { createDuel } from './duel.js';
import { playsTogether } from './opening.js';
import { awardWin } from './profile.js';
import { saveProfile } from './progress.js';
import { openGift } from './garage-screen.js';
import { createRandom } from './random.js';

export function joinDuel(run, app) {
  if (!playsTogether(run.opened) || typeof app?.live?.send !== 'function') return;
  run.duel = createDuel({ ft: app, profile: run.profile, app: version, clock: () => run.nowMs, hidden: () => run.hidden, onWin: () => rewardDuel(run) });
  app.live.onMessage?.((data) => run.duel?.heard(data));
  app.onClose?.(() => run.duel?.stop());
}

function rewardDuel(run) {
  const gift = awardWin(run.profile, run.duel?.game?.luck ?? createRandom(Math.floor(run.nowMs) + 1));
  saveProfile(run.store, run.profile);
  if (gift) run.screen = openGift(gift, run.seconds);
}

export function stepDuel(run, input, now) {
  run.duel.frame(now, input);
  run.duelView = run.duel.view(now);
}

export function duelHud(run) {
  const shown = run.duelView;
  if (!shown) return {};
  return shown.stage === 'card' ? { card: shown.card } : { rival: shown.rival };
}

export const duelCardUp = (run) => run.duelView?.stage === 'card';

export const duelGoShown = (run) => duelCardUp(run) && run.duelView.card.goShown;

export function leaveDuel(run) {
  run.duel?.stop();
  run.duel = null;
  run.duelView = null;
}
