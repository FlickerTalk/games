import { FixedSteps } from "../../../kit/src/duel/steps.js";
import { Glide } from "../../../kit/src/duel/glide.js";
import { seedOf } from "../../../kit/src/canvas/random.js";
import { FLICK_PADDLE, PROGRESS, settingsFor, wonRound } from "./levels.js";
import { createMatch, scoreOf, stepMatch } from "./match.js";
import { flickSpeed, flickTarget } from "./robot.js";
import { PADDLE_SPEED, STEP_MS, STEPS_PER_SECOND, movePaddle } from "./table.js";

// ms
export const COUNTDOWN = 3000;
export const END_PAUSE = 1400;
const MOMENTS = { hit: 450, wall: 300, pop: 700, pick: 900, goal: 1100 };
const SOUNDS = { hit: ["bounce", 0.8], wall: ["tick", 0.35], pop: ["pop", 0.8], pick: ["collect", 0.9] };

export function newRound(game, { kind, seed, seat = 0, startAt, settings, looks }) {
  const roundSteps = settings.seconds * STEPS_PER_SECOND;
  const match = createMatch({ seed, speed: settings.speed, roundSteps });
  if (kind === "flick") match.paddles[1].speed = PADDLE_SPEED * flickSpeed(settings.skill);
  const own = kind === "friend" ? [seat === 0, seat === 1] : [true, true];
  return {
    kind, seat, own, match, settings, startAt, looks, steps: new FixedSteps({ step: STEP_MS }),
    fingers: new Map(), glides: [new Glide({ most: 0.5 }), new Glide({ most: 0.5 })],
    endAt: null, sent: false, theirs: null, table: game.state.progress.chosen.table,
  };
}

export function beginLocal(game, kind) {
  const { state } = game;
  const settings = settingsFor(state.progress, kind);
  const mine = state.progress.chosen.paddle;
  const looks = kind === "flick" ? [mine, FLICK_PADDLE] : [mine, mine];
  const seed = seedOf(`${game.random()}/${game.random()}/${game.now()}`);
  showRound(game, newRound(game, { kind, seed, startAt: game.now() + COUNTDOWN, settings, looks }));
}

export function showRound(game, round) {
  const { state } = game;
  Object.assign(state, { round, screen: "play", paused: false, outcome: null, moments: [] });
  game.sound.music("playful");
  game.resize(state.width, state.height, state.fill);
}

export function addMoments(game, events) {
  const { state } = game;
  const now = game.now();
  const mine = state.round?.seat ?? 0;
  for (const event of events) {
    state.moments.push({ ...event, start: now, duration: MOMENTS[event.kind] ?? 500 });
    if (event.kind === "goal") game.sound.play(event.seat === mine ? "splash" : "success");
    else if (SOUNDS[event.kind]) game.sound.play(SOUNDS[event.kind][0], { gain: SOUNDS[event.kind][1] });
  }
}

export function stepRound(game, round) {
  const events = [];
  const steps = round.steps.due(game.now());
  for (let at = 0; at < steps && !round.match.over; at += 1) {
    if (round.kind === "flick") round.match.paddles[1].target = flickTarget(round.match, 1, { skill: round.settings.skill });
    const out = stepMatch(round.match, round.own);
    round.match = out.match;
    events.push(...out.events);
  }
  addMoments(game, events);
  return events;
}

export function warmUp(round, now) {
  for (let at = round.steps.due(now); at > 0; at -= 1) {
    round.match.paddles.forEach((paddle, seat) => round.own[seat] && movePaddle(paddle, paddle.speed));
  }
}

export function closeRound(game, round, score) {
  if (round.done) return;
  round.done = true;
  game.run(() => endRound(game, score));
}

export function advanceLocal(game) {
  const { round } = game.state;
  const now = game.now();
  if (game.state.paused) {
    round.steps.reset();
    return;
  }
  if (now < round.startAt) {
    warmUp(round, now);
    return;
  }
  stepRound(game, round);
  if (round.match.over && round.endAt === null) round.endAt = now + END_PAUSE;
  if (round.endAt !== null && now >= round.endAt) closeRound(game, round, { mine: scoreOf(round.match, round.seat), theirs: scoreOf(round.match, 1 - round.seat) });
}

export async function endRound(game, { mine, theirs }) {
  const { state } = game;
  const round = state.round;
  if (!round || state.screen !== "play") return;
  const won = wonRound(mine, theirs);
  const award = PROGRESS.awardRound(state.progress, { won, score: mine });
  state.progress = award.record;
  state.outcome = { mine, theirs, won, stars: award.stars, best: award.record.best, newBest: award.newBest, gift: award.gift, opened: false, kind: round.kind, looks: round.looks };
  state.screen = "end";
  state.paused = false;
  game.sound.pause(false);
  state.moments = won ? [{ kind: "confetti", start: game.now(), duration: 2200 }] : [];
  game.sound.play(mine > theirs ? "win" : mine === theirs ? "star" : "lose-soft");
  game.saveProgress();
}

export function leaveRound(game) {
  const { state } = game;
  if (state.round?.kind === "friend") game.duel?.leave();
  Object.assign(state, { round: null, paused: false, screen: "home", moments: [] });
  game.sound.pause(false);
}

export const leftOf = (round) => Math.max(0, 1 - round.match.step / round.match.roundSteps);
