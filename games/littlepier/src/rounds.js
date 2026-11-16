import { seedOf } from "../../../kit/src/canvas/random.js";
import { starsFor } from "../../../kit/src/progress/index.js";
import { flickHolding, freshFlick } from "./flick.js";
import { PROGRESS, dayOf, roundSetup, thresholdsFor, trackOf, wonRound } from "./levels.js";
import { isFind } from "./pond.js";
import { encodeReport } from "./report.js";
import { catchesOf, resumeRound, roundSnapshot, startRound, stepRound, visitorsIn } from "./round.js";

const END_PAUSE = 1400;
const LANDING = 700;
const SEA = 0.45;
const STEP_MOST = 0.1;

export const roundKey = (state) => `round/${state.chat ?? "-"}`;

function keep(game) {
  const { state } = game;
  if (!state.round || !state.setup) return game.pending;
  state.snapshot = { v: 1, mode: state.mode, setup: state.setup, round: roundSnapshot(state.round) };
  const kept = JSON.stringify(state.snapshot);
  return game.run(() => game.store?.set(roundKey(state), kept));
}

export const keepRound = keep;

function show(game, snapshot) {
  const { state } = game;
  const round = resumeRound(snapshot.round, { anglers: snapshot.setup.anglers });
  if (!round) return false;
  Object.assign(state, {
    screen: "play", round, setup: snapshot.setup, day: snapshot.setup.day, flick: snapshot.setup.anglers > 1 ? freshFlick() : null,
    paused: false, outcome: null, moments: [], holding: false, finger: null, cast: 0, endAt: null, resume: null, frameAt: game.now(),
    hint: !state.taught, flickHolding: false,
  });
  game.resize(state.width, state.height, state.fill);
  game.sound.music("calm");
  game.sound.drone?.("sea", { level: SEA });
  keep(game);
  return true;
}

async function sameWater(game, kept) {
  if (kept?.mode !== game.state.mode || !kept.round || !kept.setup) return false;
  if (game.state.mode !== "friend") return true;
  return (await game.duel.start()).seed === kept.round.seed;
}

async function seedFor(game) {
  if (game.state.mode === "friend") return game.duel.start();
  return { seed: seedOf(`${game.random()}/${game.random()}/${game.now()}`), index: null };
}

export async function beginRound(game) {
  const { state } = game;
  if ((await sameWater(game, state.resume)) && show(game, state.resume)) return;
  const setup = roundSetup(state.progress, state.mode);
  const { seed, index } = await seedFor(game);
  const day = dayOf(state.mode === "friend" ? index : state.rounds);
  const round = startRound({ seed, seconds: setup.seconds, pace: setup.pace, anglers: setup.anglers });
  show(game, { v: 1, mode: state.mode, setup: { ...setup, day, duelIndex: index }, round: roundSnapshot(round) });
}

function moment(game, kind, fields) {
  game.state.moments.push({ kind, start: game.now(), ...fields });
}

function scorePoint({ bar, row }) {
  return { x: bar.x + 26, y: bar.y + row / 2 };
}

function albumPoint(layout) {
  if (layout.album) return { x: layout.album.x + layout.album.w / 2, y: layout.album.y + layout.album.h / 2 };
  return { x: layout.controls.pause.x - 30, y: layout.bar.y + layout.row / 2 };
}

function addToAlbum(game, kind) {
  const { state } = game;
  if (isFind(kind) || state.album.includes(kind)) return false;
  state.album = [...state.album, kind].sort((one, two) => one - two);
  game.saveOwn();
  return true;
}

function landed(game, { hook, id }) {
  const { state } = game;
  const { layout } = state;
  const visitor = visitorsIn(state.round).find((one) => one.id === id);
  const now = game.now();
  const from = { x: layout.hooks[hook], y: layout.horizon };
  const bucket = { x: layout.bucket.x, y: layout.bucket.y - layout.bucket.size * 0.2 };
  moment(game, "splash", { x: from.x, y: from.y, size: layout.fish * 0.8, duration: 600 });
  moment(game, "jump", { what: visitor.kind, from, to: bucket, size: layout.fish, duration: LANDING });
  moment(game, "cheer", { seat: hook, duration: 1100 });
  moment(game, "stars", { from: bucket, to: scorePoint(layout), start: now + LANDING, duration: 700 });
  if (isFind(visitor.kind)) moment(game, "find", { what: visitor.kind, at: bucket, size: layout.fish, start: now + LANDING, duration: 1200 });
  else {
    const away = { x: bucket.x + (hook ? 1 : -1) * layout.width * 0.2, y: layout.horizon + layout.fish * 0.3 };
    moment(game, "bucket", { what: visitor.kind, start: now + LANDING, duration: 1000 });
    moment(game, "release", { what: visitor.kind, from: bucket, to: away, size: layout.fish, start: now + LANDING + 1000, duration: 800 });
  }
  if (addToAlbum(game, visitor.kind)) {
    moment(game, "sticker", { what: visitor.kind, from: bucket, to: albumPoint(layout), size: layout.fish, start: now + LANDING, duration: 1100 });
    game.sound.play("star", { delay: (LANDING + 50) / 1000 });
  }
  game.sound.play("collect", { gain: hook ? 0.6 : 1 });
  keep(game);
}

function answer(game, event, now) {
  const { state } = game;
  const { layout } = state;
  if (event.kind === "bite") {
    game.sound.play("pop", { gain: event.hook ? 0.5 : 1 });
    moment(game, "splash", { x: layout.hooks[event.hook], y: layout.horizon, size: layout.fish * 0.6, duration: 500 });
  }
  if (event.kind === "slip") {
    game.sound.play("whoosh", { gain: 0.5 });
    moment(game, "laugh", { seat: event.hook, duration: 1300 });
  }
  if (event.kind === "catch") landed(game, event);
  if (event.kind === "end") state.endAt = now + END_PAUSE;
}

export function stepPlay(game, now) {
  const { state } = game;
  const step = Math.min(STEP_MOST, Math.max(0, (now - (state.frameAt ?? now)) / 1000));
  state.frameAt = now;
  if (state.screen !== "play" || state.paused || !state.round || state.round.over || !state.layout) return;
  const mine = state.holding || now < state.cast;
  let flick = false;
  if (state.flick) {
    const plan = flickHolding(state.round, state.flick, { rest: state.setup.rest });
    state.flick = plan.memory;
    flick = plan.holding;
  }
  state.flickHolding = flick;
  const { round, events } = stepRound(state.round, step, { holding: [mine, flick], reach: state.layout.reach });
  state.round = round;
  for (const event of events) answer(game, event, now);
}

export function finishDue(game) {
  game.state.endAt = null;
  return game.run(() => endRound(game));
}

async function endRound(game) {
  const { state } = game;
  const { round, setup } = state;
  const score = catchesOf(round);
  const stars = starsFor(score, thresholdsFor(state.mode));
  const track = trackOf(state.mode);
  const award = PROGRESS.awardRound(state.progress, { won: wonRound(stars), score, track });
  state.progress = award.record;
  game.saveProgress();
  if (state.mode === "friend") await game.duel.finish(setup.duelIndex, encodeReport(round.seed, round.caught[0]));
  state.rounds += 1;
  game.saveOwn();
  const best = track ? award.record.bests[track] : award.record.best;
  state.outcome = { score, stars: award.stars, best, newBest: award.newBest, gift: award.gift, opened: false, flick: round.caught[1]?.length ?? null, duelIndex: setup.duelIndex };
  Object.assign(state, { screen: "end", snapshot: null, holding: false, finger: null });
  game.sound.drone?.("sea", null);
  game.sound.play(award.stars >= 2 ? "win" : "star");
  await game.store?.set(roundKey(state), "null");
}
