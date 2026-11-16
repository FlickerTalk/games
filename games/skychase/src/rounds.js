import { seedOf } from "../../../kit/src/canvas/random.js";
import { FixedSteps } from "../../../kit/src/duel/steps.js";
import { STEPS_PER_SECOND, STEP_MS } from "./arena.js";
import { PROGRESS, colourFor, familyOf, rivalCraft, settingsFor, wonRound } from "./levels.js";
import { createMatch, scoreOf, stepMatch } from "./match.js";
import { createMind, flickStep } from "./robot.js";
import { keepTurning } from "./touch.js";

// ms
export const COUNTDOWN = 3000;
export const END_PAUSE = 1400;
const MOMENTS = { pop: 900, ring: 600, bonk: 400 };

export const lookOf = (state) => ({ craft: state.progress.chosen[state.flying], colour: state.colour });

export const rivalLook = (mine) => ({ craft: rivalCraft(mine.craft), colour: colourFor(mine.colour) });

export function newRound(game, { kind, seed, seat = 0, startAt, settings, looks }) {
  const match = createMatch({ seed, twists: settings.twists, roundSteps: settings.seconds * STEPS_PER_SECOND, families: looks.map((look) => familyOf(look.craft)) });
  return {
    kind, seat, match, settings, startAt, looks,
    own: kind === "friend" ? [seat === 0, seat === 1] : [true, true],
    mind: kind === "flick" ? createMind(seed) : null,
    steps: new FixedSteps({ step: STEP_MS }),
    fingers: new Map(),
    turning: null, endAt: null, sent: false, theirs: null, urgent: false, rewind: 0,
    place: settings.place,
  };
}

export function showRound(game, round) {
  const { state } = game;
  Object.assign(state, { round, screen: "play", paused: false, outcome: null, moments: [] });
  game.sound.music("playful");
  game.resize(state.width, state.height, state.fill);
}

export function beginLocal(game) {
  const { state } = game;
  const seed = seedOf(`${game.random()}/${game.random()}/${game.now()}`);
  const mine = lookOf(state);
  showRound(game, newRound(game, { kind: "flick", seed, startAt: game.now() + COUNTDOWN, settings: settingsFor(state.progress, "flick", seed), looks: [mine, rivalLook(mine)] }));
}

function sound(game, event, mine) {
  if (event.kind === "pop") {
    game.sound.play("pop");
    if (event.by === mine) game.sound.play("success");
  } else if (event.kind === "ring") game.sound.play("whoosh", { gain: 0.6 });
  else if (event.kind === "bonk") game.sound.play("bounce", { gain: 0.6 });
}

export function addMoments(game, events) {
  const { state } = game;
  const now = game.now();
  const mine = state.round?.seat ?? 0;
  for (const event of events) {
    if (MOMENTS[event.kind]) state.moments.push({ ...event, start: now, duration: MOMENTS[event.kind] });
    sound(game, event, mine);
  }
}

export function stepRound(game, round) {
  const events = [];
  const { match } = round;
  for (let left = round.steps.due(game.now()); left > 0 && !match.over; left -= 1) {
    if (round.mind) flickStep(match, 1 - round.seat, round.mind, { skill: round.settings.skill });
    keepTurning(round);
    events.push(...stepMatch(match, round.own, round.rewind));
  }
  addMoments(game, events);
  return events;
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
  if (award.gift) state.flying = familyOf(award.gift);
  state.screen = "end";
  state.paused = false;
  game.sound.pause(false);
  state.moments = won ? [{ kind: "confetti", start: game.now(), duration: 2200 }] : [];
  game.sound.play(won ? "win" : mine === theirs ? "star" : "lose-soft");
  game.saveProgress();
  if (award.gift) game.saveOwn();
}

export function leaveRound(game) {
  const { state } = game;
  if (state.round?.kind === "friend") game.duel?.leave();
  Object.assign(state, { round: null, paused: false, screen: "home", moments: [] });
  game.sound.pause(false);
}

export const leftOf = (round) => Math.max(0, 1 - round.match.step / round.match.roundSteps);
