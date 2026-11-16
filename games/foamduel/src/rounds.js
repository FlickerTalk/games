import { seedOf } from "../../../kit/src/canvas/random.js";
import { FixedSteps } from "../../../kit/src/duel/steps.js";
import { FLOOR_MS, STEPS_PER_SECOND, STEP_MS, WINDOW_MS, exchangeAt, scheduleOf, standing, tally } from "./duel.js";
import { FLICK_SWORD, PROGRESS, otherSword, settingsFor, wonRound } from "./levels.js";
import { flickPlan, flickReaction } from "./robot.js";

// ms
export const COUNTDOWN = 3000;
export const END_PAUSE = 1400;
export const POP_DELAY = 170;
// how far the other phone's round may run behind what it last said
const SLACK = 80;
const MOMENTS = { strike: 420, pop: 600, stumble: 950, laugh: 1000 };
const STALL = 250;

export function newRound(game, { kind, seed, seat = 0, startAt, settings }) {
  const schedule = scheduleOf(seed, settings);
  const { sword, scenery } = game.state.progress.chosen;
  return {
    kind, seat, seed, settings, schedule, startAt, step: 0, roundSteps: settings.seconds * STEPS_PER_SECOND,
    steps: new FixedSteps({ step: STEP_MS }), claims: [[], []], shown: new Map(), verdicts: new Map(), open: 0, scores: [0, 0],
    flick: kind === "flick" ? flickPlan(seed, schedule) : null, scenery, swords: [sword, kind === "flick" ? FLICK_SWORD : otherSword(sword)],
    endAt: null, sent: false, heard: null, urgent: false,
  };
}

// The round's own time in ms: it stops with the round, and runs between two frames.
export function clockOf(round, now) {
  const { last, carry } = round.steps;
  return round.step * STEP_MS + carry + (last === null ? 0 : Math.min(STALL, Math.max(0, now - last)));
}

export const currentOf = (round) => exchangeAt(round.schedule, round.step);
const claimOf = (round, seat, x) => round.claims[seat].find((one) => one.x === x) ?? null;
const elapsedOf = (round, x, now) => (round.shown.has(x) ? clockOf(round, now) - round.shown.get(x) : -1);

function theirElapsed(round, exchange, now) {
  if (round.kind !== "friend") return elapsedOf(round, exchange.x, now);
  return round.heard ? (round.heard.n - exchange.signal) * STEP_MS : -1;
}

function standingOf(round, exchange, now) {
  return standing({
    mine: claimOf(round, round.seat, exchange.x),
    theirs: claimOf(round, 1 - round.seat, exchange.x),
    myElapsed: elapsedOf(round, exchange.x, now),
    theirElapsed: theirElapsed(round, exchange, now),
    slack: round.kind === "friend" ? SLACK : 0,
    over: round.step >= exchange.end,
  });
}

function moment(game, kind, side, x, delay = 0) {
  game.state.moments.push({ kind, side, x, start: game.now() + delay, duration: MOMENTS[kind] });
}

function settle(game, round, exchange, { win, early }) {
  const { moments } = game.state;
  round.verdicts.set(exchange.x, { win, early, at: game.now() });
  win.forEach((won, side) => {
    if (!won) return;
    round.scores[side] += 1;
    moment(game, "strike", side, exchange.x);
    moment(game, "pop", 1 - side, exchange.x, POP_DELAY);
    moment(game, "laugh", 1 - side, exchange.x, POP_DELAY);
    game.sound.play("pop", { gain: side === 0 ? 0.9 : 0.5, delay: POP_DELAY / 1000 });
  });
  early.forEach((fell, side) => {
    if (fell && !moments.some((one) => one.kind === "stumble" && one.x === exchange.x && one.side === side)) moment(game, "stumble", side, exchange.x);
  });
}

// Shows what can be shown of the exchanges so far: sides are [this player, the other].
export function review(game, round, now) {
  while (round.open < round.schedule.length && round.schedule[round.open].ready <= round.step) {
    const exchange = round.schedule[round.open];
    const seen = standingOf(round, exchange, now);
    if (seen.state !== "done") return;
    settle(game, round, exchange, seen);
    round.open += 1;
  }
}

function flickActs(round, now) {
  const exchange = currentOf(round);
  if (!exchange || round.verdicts.has(exchange.x) || claimOf(round, 1, exchange.x)) return;
  const plan = round.flick[exchange.x];
  if (plan.early !== null) {
    if (round.step >= plan.early && round.step < exchange.signal) round.claims[1].push({ x: exchange.x, r: 0, seat: 1 });
    return;
  }
  const r = flickReaction(plan, { react: round.settings.react, lead: round.scores[1] - round.scores[0] });
  if (elapsedOf(round, exchange.x, now) >= r) round.claims[1].push({ x: exchange.x, r, seat: 1 });
}

const playable = (game, round) => !game.state.paused && game.now() >= round.startAt && round.step < round.roundSteps && !round.sent && round.heard?.p !== 1;

export function strike(game, seat) {
  const { state } = game;
  const { round } = state;
  const now = game.now();
  if (!round || state.screen !== "play" || !playable(game, round)) return;
  if (round.flick) flickActs(round, now);
  review(game, round, now);
  const exchange = currentOf(round);
  if (!exchange || round.step >= exchange.close || round.verdicts.has(exchange.x) || claimOf(round, seat, exchange.x)) return;
  const elapsed = elapsedOf(round, exchange.x, now);
  const r = elapsed < 0 ? 0 : Math.max(1, Math.round(elapsed));
  if (r > WINDOW_MS) return;
  round.claims[seat].push({ x: exchange.x, r, seat });
  round.urgent = true;
  const side = seat === round.seat ? 0 : 1;
  if (r < FLOOR_MS) {
    moment(game, "stumble", side, exchange.x);
    game.sound.play("error-soft", { gain: 0.8 });
  } else {
    game.sound.play("whoosh", { gain: 0.8 });
    if (side === 0 && !state.taught) {
      state.taught = true;
      game.saveOwn();
    }
  }
  review(game, round, now);
}

function ring(game, round) {
  const exchange = currentOf(round);
  if (!exchange || round.verdicts.has(exchange.x)) return;
  if (round.step === exchange.signal) game.sound.play("bell");
  else if (exchange.fakes.some((fake) => fake.at === round.step)) game.sound.play("bounce", { gain: 0.5 });
}

export function stepRound(game, round, now) {
  for (let left = round.steps.due(now); left > 0 && round.step < round.roundSteps; left -= 1) {
    round.step += 1;
    ring(game, round);
  }
  const exchange = currentOf(round);
  if (exchange && round.step >= exchange.signal && round.step < exchange.close && !round.shown.has(exchange.x) && !round.verdicts.has(exchange.x)) {
    round.shown.set(exchange.x, round.step * STEP_MS + round.steps.carry);
  }
  if (round.flick) flickActs(round, now);
  review(game, round, now);
}

export function beginLocal(game, kind) {
  const settings = settingsFor(game.state.progress, kind);
  const seed = seedOf(`${game.random()}/${game.random()}/${game.now()}`);
  showRound(game, newRound(game, { kind, seed, startAt: game.now() + COUNTDOWN, settings }));
}

export function showRound(game, round) {
  const { state } = game;
  Object.assign(state, { round, screen: "play", paused: false, outcome: null, moments: [], press: null });
  game.sound.music("playful");
  game.resize(state.width, state.height, state.fill);
}

export function scoresOf(round, claims = [...round.claims[0], ...round.claims[1]]) {
  const { scores } = tally(round.schedule, claims);
  return { mine: scores[round.seat], theirs: scores[1 - round.seat] };
}

export function closeRound(game, round, score) {
  if (round.done) return;
  round.done = true;
  game.run(() => endRound(game, score));
}

export function advanceLocal(game) {
  const { round } = game.state;
  const now = game.now();
  if (game.state.paused || now < round.startAt) {
    round.steps.reset();
    return;
  }
  stepRound(game, round, now);
  if (round.step >= round.roundSteps && round.endAt === null) round.endAt = now + END_PAUSE;
  if (round.endAt !== null && now >= round.endAt) closeRound(game, round, scoresOf(round));
}

export async function endRound(game, { mine, theirs }) {
  const { state } = game;
  const round = state.round;
  if (!round || state.screen !== "play") return;
  const won = wonRound(mine, theirs);
  const award = PROGRESS.awardRound(state.progress, { won, score: mine });
  state.progress = award.record;
  state.outcome = { mine, theirs, won, stars: award.stars, best: award.record.best, newBest: award.newBest, gift: award.gift, opened: false, kind: round.kind };
  state.screen = "end";
  state.paused = false;
  state.press = null;
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

export const leftOf = (round) => Math.max(0, 1 - round.step / round.roundSteps);
