import { seedOf } from "../../../kit/src/canvas/random.js";
import { FixedSteps } from "../../../kit/src/duel/steps.js";
import { catchCraft, fire, freeCraft, joined, moveCraft, newCraft, stepBolts } from "./crafts.js";
import { RULES, hazardsAt } from "./hazards.js";
import { metricsOf } from "./layout.js";
import { HULLS, PROGRESS, hullOf, settingsFor, wonRound, zoneFor } from "./levels.js";
import { flickStep, newFlick } from "./robot.js";
import { KINDS, MOST_CLAIMS, STEP_MS, placeAt, presentAt, scheduleOf, tally } from "./waves.js";

// ms
export const COUNTDOWN = 3000;
export const END_PAUSE = 1500;
const MOMENTS = { pop: 650, hit: 300, block: 300, orb: 700, caught: 500, freed: 700, cleared: 1600 };
const WINGMAN = 3;

export function newRound(game, { kind, seed, seat = 0, startAt, settings }) {
  const { state } = game;
  const schedule = scheduleOf(seed, settings);
  const mine = HULLS[state.world].indexOf(hullOf(state.progress, state.world));
  const hulls = [mine, (mine + WINGMAN) % HULLS[state.world].length];
  return {
    kind, seat, seed, settings, schedule, startAt, step: 0, roundSteps: schedule.roundSteps, steps: new FixedSteps({ step: STEP_MS }),
    mine: [], theirs: [], tally: tally(schedule, []), crafts: [newCraft(0), newCraft(1)], flick: kind === "flick" ? newFlick(seed) : null,
    world: state.world, zone: zoneFor(state.world, settings.level), hulls: seat === 0 ? hulls : hulls.reverse(), spent: new Set(), joined: false,
    endAt: null, sent: false, heard: null, urgent: false, done: false,
  };
}

export const overOf = (round) => round.step >= round.roundSteps || round.tally.clearedAt !== null;

export function seenOf(round, layout, step = round.step) {
  return presentAt(round.schedule, round.tally, step).map((one) => ({ ...one, r: (KINDS[one.enemy.kind].size * layout.unit) / 2 }));
}

export function fallingOf(round, layout, step = round.step) {
  const rule = RULES[round.world];
  const r = (rule.size * layout.unit) / 2;
  return hazardsAt(round.schedule, round.tally, step, rule).filter((one) => !round.spent.has(one.key)).map((one) => ({ ...one, r }));
}

function moment(game, kind, more = {}) {
  game.state.moments.push({ kind, start: game.now(), duration: MOMENTS[kind], ...more });
}

const loud = (round, seat) => (seat === round.seat ? 0.9 : 0.4);

export function retally(game, round) {
  const before = round.tally;
  const after = tally(round.schedule, [...round.mine, ...round.theirs]);
  round.tally = after;
  for (const [id, pop] of after.pops) {
    if (before.pops.has(id)) continue;
    const place = placeAt(round.schedule, after, id, pop.t);
    const look = round.schedule.enemies[id].kind;
    moment(game, "pop", { ...place, look, id, by: pop.seat });
    moment(game, "orb", { ...place, by: pop.seat });
    game.sound.play(look === "core" ? "success" : "pop", { gain: loud(round, pop.seat) });
  }
  for (const [id, count] of after.hits) {
    if (after.pops.has(id) || count <= (before.hits.get(id) ?? 0)) continue;
    moment(game, "hit", { id });
    game.sound.play("bounce", { gain: 0.5 });
  }
  if (after.clearedAt !== null && before.clearedAt === null) {
    moment(game, "cleared");
    game.sound.play("star");
  }
}

export function noteCaught(game, round, seat) {
  moment(game, "caught", { seat });
  game.sound.play("error-soft", { gain: loud(round, seat) });
}

export function noteFreed(game, round, seat, touched) {
  moment(game, "freed", { seat, touched });
  if (touched) game.sound.play("collect", { gain: 0.9 });
  if (touched && seat !== round.seat && !game.state.taught.includes("free")) game.teach("free");
}

function flyOwn(game, round, craft, mate, { seen, falling, metrics }) {
  const claims = craft.seat === round.seat ? round.mine : round.theirs;
  if (moveCraft(craft) === "loose") noteFreed(game, round, craft.seat, false);
  const key = catchCraft(craft, falling, metrics);
  if (key !== null) {
    round.spent.add(key);
    noteCaught(game, round, craft.seat);
  }
  if (freeCraft(craft, mate, metrics)) noteFreed(game, round, craft.seat, true);
  if (fire(craft, round.step, round.joined) && craft.seat === round.seat) game.sound.play("tick", { gain: 0.25 });
  let claimed = false;
  for (const event of stepBolts(craft, seen, metrics)) {
    if (event.kind === "block") moment(game, "block", { u: event.u, v: event.v });
    else if (claims.length < MOST_CLAIMS) {
      claims.push({ id: event.id, t: round.step, seat: craft.seat });
      claimed = true;
    }
  }
  return claimed;
}

function flyShown(round, craft, seen, metrics) {
  fire(craft, round.step, round.joined);
  stepBolts(craft, seen, metrics);
}

// Returns whether this phone's own state changed in a way the other must hear soon.
export function stepRound(game, round) {
  const { layout } = game.state;
  const metrics = metricsOf(layout);
  const [me, mate] = [round.crafts[round.seat], round.crafts[1 - round.seat]];
  let urgent = false;
  for (let left = round.steps.due(game.now()); left > 0 && !overOf(round); left -= 1) {
    round.step += 1;
    const seen = seenOf(round, layout);
    const falling = fallingOf(round, layout);
    const was = me.caught > 0;
    round.joined = joined(me, mate, metrics);
    const mine = flyOwn(game, round, me, mate, { seen, falling, metrics });
    let theirs = false;
    if (round.flick) {
      const { scores } = round.tally;
      flickStep(round.flick, { step: round.step, craft: mate, mate: me, seen, hazards: falling, skill: round.settings.skill, lead: scores[mate.seat] - scores[me.seat], metrics });
      theirs = flyOwn(game, round, mate, me, { seen, falling, metrics });
    } else flyShown(round, mate, seen, metrics);
    if (mine || theirs) retally(game, round);
    urgent ||= mine || was !== me.caught > 0;
  }
  return urgent;
}

export function beginLocal(game) {
  const seed = seedOf(`${game.random()}/${game.random()}/${game.now()}`);
  showRound(game, newRound(game, { kind: "flick", seed, startAt: game.now() + COUNTDOWN, settings: settingsFor(game.state.progress, "flick", seed) }));
}

export function showRound(game, round) {
  const { state } = game;
  Object.assign(state, { round, screen: "play", paused: false, outcome: null, moments: [], steer: null });
  game.sound.music("playful");
  game.resize(state.width, state.height, state.fill);
}

export const resultOf = (round, counted = round.tally) => ({ score: counted.total, mine: counted.scores[round.seat], theirs: counted.scores[1 - round.seat], cleared: counted.clearedAt !== null });

export function closeRound(game, round, result) {
  if (round.done) return;
  round.done = true;
  game.run(() => endRound(game, result));
}

export function advanceLocal(game) {
  const { round } = game.state;
  const now = game.now();
  if (game.state.paused || now < round.startAt) {
    round.steps.reset();
    return;
  }
  stepRound(game, round);
  if (overOf(round) && round.endAt === null) round.endAt = now + END_PAUSE;
  if (round.endAt !== null && now >= round.endAt) closeRound(game, round, resultOf(round));
}

export async function endRound(game, { score, mine, theirs, cleared }) {
  const { state } = game;
  const round = state.round;
  if (!round || state.screen !== "play") return;
  const worth = round.schedule.enemies.reduce((sum, enemy) => sum + KINDS[enemy.kind].worth, 0);
  const won = wonRound({ cleared, score, worth });
  const award = PROGRESS.awardRound(state.progress, { won, score });
  state.progress = award.record;
  state.outcome = { score, mine, theirs, cleared, won, stars: award.stars, best: award.record.best, newBest: award.newBest, gift: award.gift, opened: false, kind: round.kind };
  state.screen = "end";
  state.paused = false;
  state.steer = null;
  game.sound.pause(false);
  state.moments = won ? [{ kind: "confetti", start: game.now(), duration: 2200 }] : [];
  game.sound.play(won ? "win" : "star");
  game.saveProgress();
}

export function leaveRound(game) {
  const { state } = game;
  if (state.round?.kind === "friend") game.duel?.leave();
  Object.assign(state, { round: null, paused: false, screen: "home", moments: [], steer: null });
  game.sound.pause(false);
}

export const leftOf = (round) => Math.max(0, 1 - round.step / round.roundSteps);
