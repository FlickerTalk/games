import { Session } from '../../../kit/src/live/session.js';
import { createGame, stepGame } from './game.js';
import { createRival } from './rival.js';
import { DUEL, sealAbout, openAbout, kindOf, checkState, duelLevel, seedOf } from './duel-wire.js';
import { RACE } from './tuning.js';

const STEP = 1 / 60;
const MOST_STEPS = 8;
const STOPPED = 0.5;
const CARD_AFTER = { crossed: RACE.finishPauseSeconds * 1000, decided: 15000 };
const OFF_TRACK = ['idle', 'waiting', 'lobby', 'left'];

const round = (value, places) => Math.round(value * 10 ** places) / 10 ** places;

export function createDuel({ ft, profile, clock = () => performance.now(), timing = {}, newId, app = '0', hidden = () => false, onWin = () => {} }) {
  const duel = {
    ft, profile, clock, hidden, onWin, about: new Map(), rival: createRival(), game: null, raceId: null,
    carry: 0, lastNow: null, crossedAt: null, decidedAt: null, rewarded: null,
  };
  const live = {
    live: {
      send(data) {
        if (kindOf(data) === 'hello') tell(duel);
        return ft.live.send(data);
      },
    },
  };
  duel.session = new Session({
    ft: live, g: DUEL.g, gv: DUEL.gv, app, check: checkState, clock, timing,
    onChange: () => changed(duel),
    onState: (state, t, at) => duel.rival.heard(state, t, at),
    ...(newId ? { newId } : {}),
  });
  return {
    get session() {
      return duel.session;
    },
    get game() {
      return duel.game;
    },
    heard: (data) => heard(duel, data),
    start: () => duel.session.start(),
    stop: () => duel.session.stop(),
    away: () => leaveRace(duel),
    frame: (now, input) => frame(duel, now, input),
    view: (now) => view(duel, now),
    vehicleChanged() {
      if (['waiting', 'lobby'].includes(duel.session.phase)) tell(duel);
    },
  };
}

function tell(duel) {
  const { session, profile, ft } = duel;
  if (session.cut || !session.id || !session.me) return;
  const doc = session.id;
  const data = sealAbout({ doc, who: session.me, best: profile.topLevel, kind: profile.kind, color: profile.color });
  let sent;
  try {
    sent = Promise.resolve(ft.live.send(data));
  } catch {
    sent = Promise.resolve(false);
  }
  sent.then((ok) => ok || session.refused(doc), () => session.refused(doc));
}

function heard(duel, data) {
  const about = openAbout(data);
  if (about) duel.about.set(about.who, about);
  else duel.session.heard(data);
}

// the race ends for both rather than wait for a phone that cannot drive it
function leaveRace(duel) {
  if (duel.session.running) duel.session.stop();
}

function changed(duel) {
  const { session } = duel;
  if (session.running && duel.hidden()) return leaveRace(duel);
  if (session.phase === 'countdown' && session.id !== duel.raceId) newRace(duel);
  if (session.phase === 'over' && duel.game && duel.decidedAt === null) duel.decidedAt = duel.clock();
  if (session.phase === 'over' && session.result?.won && duel.rewarded !== session.id) {
    duel.rewarded = session.id;
    duel.onWin();
  }
}

function theirAbout(duel) {
  return duel.about.get(duel.session.peer) ?? null;
}

function newRace(duel) {
  const { session, profile } = duel;
  const seed = seedOf(session.id);
  const theirs = theirAbout(duel)?.best ?? profile.topLevel;
  const game = createGame({ level: duelLevel({ mine: profile.topLevel, theirs, seed }), seed, robot: false });
  game.player.x = session.seat === 0 ? -RACE.startOffsetX : RACE.startOffsetX;
  game.state = 'countdown';
  game.countdownLength = session.timing.countdown / 1000;
  game.timer = session.until(duel.clock()) / 1000;
  Object.assign(duel, { game, raceId: session.id, carry: 0, lastNow: null, crossedAt: null, decidedAt: null });
  duel.rival.reset();
}

function frame(duel, now, input) {
  const { session, game } = duel;
  session.tick(now);
  if (!game) return;
  if (game.state === 'countdown') {
    countDown(duel, now);
    return;
  }
  duel.carry += duel.lastNow === null ? 0 : Math.min(0.25, Math.max(0, (now - duel.lastNow) / 1000));
  duel.lastNow = now;
  for (let steps = 0; duel.carry >= STEP && steps < MOST_STEPS; steps += 1) {
    stepGame(game, input, STEP);
    duel.carry -= STEP;
  }
  report(duel, now);
}

function countDown(duel, now) {
  const { game } = duel;
  game.timer = duel.session.until(now) / 1000;
  if (game.timer > 0) return;
  Object.assign(game, { state: 'racing', goLight: RACE.goLightSeconds });
  duel.lastNow = now;
  duel.carry = 0;
}

function stateOf(game, profile) {
  const { player } = game;
  return {
    d: round(player.distance, 2), x: round(player.x, 2), v: round(player.speed, 2),
    k: profile.kind, c: profile.color, b: player.braking ? 1 : 0,
  };
}

function report(duel, now) {
  const { session, game } = duel;
  if (game.state === 'racing') session.run(game.raceTime * 1000, stateOf(game, duel.profile), now);
  if (game.state === 'finished' && duel.crossedAt === null) {
    duel.crossedAt = now;
    session.finish(game.finishTime * 1000);
  }
}

function onTrack(duel, now) {
  const { session, game } = duel;
  if (!game || OFF_TRACK.includes(session.phase)) return false;
  if (game.state !== 'finished') return duel.decidedAt === null || now - duel.decidedAt < CARD_AFTER.decided || game.player.speed > STOPPED;
  return session.phase !== 'over' || now - duel.crossedAt < CARD_AFTER.crossed;
}

function view(duel, now) {
  if (onTrack(duel, now)) return { stage: 'race', game: duel.game, rival: duel.rival.at(now) };
  return { stage: 'card', game: duel.game, card: card(duel) };
}

function card(duel) {
  const { session, game, profile } = duel;
  const them = theirAbout(duel);
  const vehicle = them ? { kind: them.kind, color: them.color } : null;
  const level = game?.level ?? duelLevel({ mine: profile.topLevel, theirs: them?.best ?? profile.topLevel, seed: 0 });
  const base = { level, result: 'start', rival: { vehicle, status: 'unknown' }, meReady: false, offerRobot: false, goShown: true };
  switch (session.phase) {
    case 'waiting':
      if (session.notice === 'notOpen') return { ...base, rival: { vehicle: null, status: 'asleep' }, offerRobot: true };
      return { ...base, rival: { vehicle: null, status: 'calling' }, meReady: true, goShown: false };
    case 'lobby':
      return { ...base, rival: { vehicle, status: session.ready.them ? 'ready' : 'here' }, meReady: session.ready.me, goShown: !session.ready.me };
    case 'over':
      return { ...base, result: session.result.won ? 'won' : 'second', rival: { vehicle, status: 'here' } };
    case 'left':
      return session.notice ? { ...base, rival: { vehicle, status: 'gone' }, offerRobot: true } : base;
    default:
      return base;
  }
}
