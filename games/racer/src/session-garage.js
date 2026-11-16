import { openGarage, tapGarage, garageView, openGift, tapGift, giftView } from './garage-screen.js';
import { awardWin } from './profile.js';
import { saveProfile } from './progress.js';
import { duelCardUp, leaveDuel } from './session-duel.js';

const BUTTON_MARGIN = 14;

const hits = (box, { x, y }, margin = 0) => x >= box.x - margin && x <= box.x + box.width + margin
  && y >= box.y - margin && y <= box.y + box.height + margin;

const cardUp = (run) => (run.duel ? duelCardUp(run) : run.game?.state === 'ready');

export function tapScreen(run, point) {
  if (!run.profile || (!run.game && !run.duel)) return;
  const { screen, seconds: time } = run;
  if (screen?.name === 'gift') {
    if (tapGift(screen, time)) run.screen = null;
    return;
  }
  if (screen?.name === 'garage') {
    const result = tapGarage(screen, run.profile, point, { ...run.renderer.screenSize(), time });
    if (result === 'changed') {
      saveProfile(run.store, run.profile);
      run.duel?.vehicleChanged();
    }
    if (result === 'closed') run.screen = null;
    return;
  }
  if (!cardUp(run)) return;
  if (run.duel && run.duelView.card.offerRobot && hits(run.renderer.robotButton(), point, BUTTON_MARGIN)) {
    leaveDuel(run);
    run.playRobot();
    return;
  }
  if (hits(run.renderer.garageButton(), point, BUTTON_MARGIN)) {
    run.screen = openGarage(run.profile, run.renderer.screenSize());
    run.garageOpened = true;
  }
}

export function noteWins(run, seconds) {
  if (!run.profile || run.game.wins <= run.winsSeen) return;
  run.winsSeen = run.game.wins;
  const gift = awardWin(run.profile, run.game.luck);
  saveProfile(run.store, run.profile);
  if (gift) run.screen = openGift(gift, seconds);
}

export function screenHud(run, seconds) {
  const { screen, profile } = run;
  if (screen?.name === 'garage') return { name: 'garage', view: garageView(screen, profile, seconds) };
  if (screen?.name === 'gift') return { name: 'gift', view: giftView(screen, profile, seconds) };
  return null;
}

export function vehicleOf(run) {
  return run.profile ? { kind: run.profile.kind, color: run.profile.color } : undefined;
}
