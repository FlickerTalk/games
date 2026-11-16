import { seedOf } from "../../../kit/src/canvas/random.js";
import { FixedSteps } from "../../../kit/src/duel/steps.js";
import { STEPS_PER_SECOND, STEP_MS, placeOf, presentAt, reachable, scheduleOf, tally } from "./fair.js";
import { fromScreen, sizeOf, toScreen } from "./layout.js";
import { PROGRESS, settingsFor, wonRound } from "./levels.js";
import { flickStep, newFlick } from "./robot.js";
import { newTool, stepShots } from "./shots.js";

// ms
export const COUNTDOWN = 3000;
export const END_PAUSE = 1400;
const MOMENTS = { pop: 600, hit: 350, puff: 700, miss: 500, burst: 1100, penalty: 900 };

export function newRound(game, { kind, seed, seat = 0, startAt, settings }) {
  const schedule = scheduleOf(seed, settings);
  return {
    kind, seat, seed, settings, schedule, startAt, step: 0, roundSteps: settings.seconds * STEPS_PER_SECOND,
    steps: new FixedSteps({ step: STEP_MS }), mine: [], theirs: [], tally: tally(schedule, []),
    tool: newTool(game.state.tool), pull: null, flick: kind === "flick" ? newFlick(seed) : null,
    scenery: game.state.progress.chosen, endAt: null, sent: false, heard: null, urgent: false,
  };
}

export function seenOf(round, layout) {
  return presentAt(round.schedule, round.step, round.tally.pops)
    .filter(reachable)
    .map(({ balloon, u, v }) => {
      const [x, y] = toScreen(layout, u, v);
      return { balloon, u, v, x, y, r: sizeOf(layout, balloon.kind) / 2 };
    });
}

function moment(game, kind, { u, v }, more = {}) {
  game.state.moments.push({ kind, u, v, start: game.now(), duration: MOMENTS[kind], ...more });
}

export function retally(game, round) {
  const before = round.tally;
  const after = tally(round.schedule, [...round.mine, ...round.theirs]);
  round.tally = after;
  for (const [id, pop] of after.pops) {
    if (before.pops.has(id)) continue;
    const balloon = round.schedule[id];
    const place = placeOf(round.schedule, balloon, pop.t, after.pops);
    if (!place) continue;
    moment(game, "pop", place, { look: balloon.kind, by: pop.seat });
    if (balloon.kind === "star") moment(game, "burst", place, { by: pop.seat });
    game.sound.play(balloon.kind === "star" ? "collect" : "pop", { gain: pop.seat === round.seat ? 0.9 : 0.4 });
  }
  for (const [id, count] of after.hits) {
    if (after.pops.has(id) || count <= (before.hits.get(id) ?? 0)) continue;
    const place = placeOf(round.schedule, round.schedule[id], round.step, after.pops);
    if (place) moment(game, "hit", place);
    game.sound.play("bounce", { gain: 0.6 });
  }
}

function puffed(game, one, by) {
  if (!one) return;
  moment(game, "puff", one, { by });
  moment(game, "penalty", one, { by });
  game.sound.play("error-soft", { gain: by === game.state.round.seat ? 0.8 : 0.3 });
}

function shotsLand(game, round, seen) {
  const { layout } = game.state;
  let claimed = false;
  for (const event of stepShots(round.tool, { step: round.step, seen, bounds: layout.field })) {
    if (event.kind === "hit") {
      round.mine.push({ id: event.id, t: round.step, seat: round.seat });
      claimed = true;
    } else if (event.kind === "puff") puffed(game, seen.find((one) => one.balloon.id === event.id), round.seat);
    else moment(game, "miss", fromScreen(layout, event), { by: round.seat });
  }
  return claimed;
}

function flickPlays(game, round, seen) {
  const { scores } = round.tally;
  const did = flickStep(round.flick, { step: round.step, shown: seen, skill: round.settings.skill, lead: scores[1 - round.seat] - scores[round.seat] });
  if (!did) return false;
  const one = seen.find(({ balloon }) => balloon.id === did.id);
  if (did.kind === "pop") round.theirs.push({ id: did.id, t: round.step, seat: 1 - round.seat });
  else if (did.kind === "puff") puffed(game, one, 1 - round.seat);
  else if (one) moment(game, "miss", one, { by: 1 - round.seat });
  return did.kind === "pop";
}

export function stepRound(game, round) {
  let claimed = false;
  for (let left = round.steps.due(game.now()); left > 0 && round.step < round.roundSteps; left -= 1) {
    round.step += 1;
    const seen = seenOf(round, game.state.layout);
    const mine = shotsLand(game, round, seen);
    const theirs = round.flick ? flickPlays(game, round, seen) : false;
    if (mine || theirs) retally(game, round);
    claimed ||= mine;
  }
  return claimed;
}

export function beginLocal(game, kind) {
  const settings = settingsFor(game.state.progress, kind);
  const seed = seedOf(`${game.random()}/${game.random()}/${game.now()}`);
  showRound(game, newRound(game, { kind, seed, startAt: game.now() + COUNTDOWN, settings }));
}

export function showRound(game, round) {
  const { state } = game;
  Object.assign(state, { round, screen: "play", paused: false, outcome: null, moments: [] });
  game.sound.music("playful");
  game.resize(state.width, state.height, state.fill);
}

export const scoresOf = (round) => ({ mine: round.tally.scores[round.seat], theirs: round.kind === "alone" ? null : round.tally.scores[1 - round.seat] });

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
  if (round.step >= round.roundSteps && round.endAt === null) round.endAt = now + END_PAUSE;
  if (round.endAt !== null && now >= round.endAt) closeRound(game, round, scoresOf(round));
}

function endSound(kind, won, mine, theirs) {
  if (kind === "alone") return won ? "win" : "star";
  return mine > theirs ? "win" : mine === theirs ? "star" : "lose-soft";
}

export async function endRound(game, { mine, theirs }) {
  const { state } = game;
  const round = state.round;
  if (!round || state.screen !== "play") return;
  const won = wonRound(round.kind, mine, theirs);
  const award = PROGRESS.awardRound(state.progress, { won, score: mine });
  state.progress = award.record;
  state.outcome = { mine, theirs, won, stars: award.stars, best: award.record.best, newBest: award.newBest, gift: award.gift, opened: false, kind: round.kind };
  state.screen = "end";
  state.paused = false;
  round.pull = null;
  game.sound.pause(false);
  state.moments = won ? [{ kind: "confetti", start: game.now(), duration: 2200 }] : [];
  game.sound.play(endSound(round.kind, won, mine, theirs));
  game.saveProgress();
}

export function leaveRound(game) {
  const { state } = game;
  if (state.round?.kind === "friend") game.duel?.leave();
  Object.assign(state, { round: null, paused: false, screen: "home", moments: [] });
  game.sound.pause(false);
}

export const leftOf = (round) => Math.max(0, 1 - round.step / round.roundSteps);
