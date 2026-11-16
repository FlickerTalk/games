import { FLICK_PACE } from "./flick.js";
import { STEPS } from "./level.js";
import { poseAt, stepsDone } from "./motion.js";
import { add, ring, slotsOf, trim, undo } from "./program.js";
import { BACK_MS, END_MS, hintOf, roundKey, savedRound } from "./rounds.js";
import { runProgram, startOf } from "./run.js";

const KEPT = ["level", "friend"];
const SOUNDS = {
  move: ["tick", { gain: 0.35 }],
  turn: ["tick", { gain: 0.25, pitch: 0.8 }],
  battery: ["collect", {}],
  goal: ["success", {}],
  bump: ["bounce", {}],
  splash: ["splash", {}],
  open: ["pick", {}],
  idle: ["tap", { gain: 0.3 }],
};
const MOMENTS = { battery: "burst", goal: "burst", bump: "dust", splash: "ripple" };

export const canEdit = (round) => Boolean(round) && round.driver === "me" && !round.run && !round.finished;

export function keepRound(game) {
  const { state } = game;
  const { round } = state;
  if (!round || !KEPT.includes(round.kind) || round.finished || round.driver !== "me") return;
  game.run(() => game.store?.set(roundKey(state), savedRound(round)));
}

function changed(game) {
  const { state } = game;
  state.hint = hintOf(state.round, state);
  keepRound(game);
}

export function addCommand(game, command) {
  const { state } = game;
  const { round } = state;
  if (!canEdit(round)) return;
  const before = slotsOf(round.edit.items);
  round.edit = add(round.edit, command);
  if (slotsOf(round.edit.items) === before) {
    game.sound.play("error-soft");
    return;
  }
  if (round.wrong !== null && round.wrong >= before) round.wrong = null;
  game.sound.play("place");
  if (!state.taught) {
    state.taught = true;
    game.saveOwn();
  }
  changed(game);
}

export function pressRing(game) {
  const { round } = game.state;
  if (!canEdit(round)) return;
  round.edit = ring(round.edit);
  game.sound.play("place", { pitch: 1.2 });
  changed(game);
}

export function pressUndo(game) {
  const { round } = game.state;
  if (!canEdit(round)) return;
  const cut = round.wrong !== null && round.wrong < slotsOf(round.edit.items);
  round.edit = cut ? trim(round.edit, round.wrong) : undo(round.edit);
  round.wrong = null;
  game.sound.play("pick");
  changed(game);
}

function startRun(game) {
  const { state } = game;
  const { round } = state;
  round.run = { ...runProgram(round.level, round.edit.items), start: game.now() };
  round.fired = 0;
  Object.assign(round, { wrong: null, failed: null, back: null });
  state.hint = null;
  game.sound.play("tap");
}

export function toggleRun(game) {
  const { round } = game.state;
  if (!round || round.driver !== "me" || round.finished) return;
  if (round.run) {
    round.run = null;
    game.sound.play("tap");
    return;
  }
  startRun(game);
}

function fire(game, step) {
  const [name, options] = SOUNDS[step.event] ?? SOUNDS.move;
  game.sound.play(name, options);
  const kind = MOMENTS[step.event];
  if (!kind) return;
  const [dx, dy] = STEPS[step.from.dir];
  const at = step.event === "bump" ? { x: step.from.x + dx * 0.45, y: step.from.y + dy * 0.45 } : { x: step.to.x, y: step.to.y };
  game.state.moments.push({ kind, ...at, start: game.now(), duration: kind === "burst" ? 700 : 600 });
}

function finishRun(game, now) {
  const { state } = game;
  const { round } = state;
  const run = round.run;
  round.run = null;
  if (run.end === "goal") {
    round.finished = run;
    state.endAt = now + END_MS;
    return;
  }
  Object.assign(round, { failed: run, wrong: run.wrong, back: now + BACK_MS });
  if (round.driver === "me") round.fails += 1;
  if (round.script) round.scriptAt = now + BACK_MS + FLICK_PACE;
  changed(game);
}

function advanceRun(game, now) {
  const { round } = game.state;
  const { run } = round;
  const done = stepsDone(run, run.start, now);
  while (round.fired < done) {
    fire(game, run.steps[round.fired]);
    round.fired += 1;
  }
  if (poseAt(run, run.start, now).done) finishRun(game, now);
}

function scriptStep(game, now) {
  const { round } = game.state;
  const action = round.script.shift();
  if (!action) {
    round.script = null;
    return;
  }
  if (action.kind === "run") {
    startRun(game);
    return;
  }
  if (action.kind === "add") round.edit = add(round.edit, action.command);
  if (action.kind === "ring") round.edit = ring(round.edit);
  if (action.kind === "cut") {
    round.edit = trim(round.edit, action.slot);
    round.wrong = null;
  }
  game.sound.play("place", { gain: 0.6 });
  round.scriptAt = now + FLICK_PACE;
}

export function startScript(game, script, at) {
  Object.assign(game.state.round, { script: [...script], scriptAt: at });
}

export function frameRound(game, now) {
  const { round } = game.state;
  if (!round) return;
  if (round.run) advanceRun(game, now);
  if (round.back !== null && now >= round.back) Object.assign(round, { back: null, failed: null });
  if (round.script && !round.run && round.back === null && !round.finished && now >= round.scriptAt) scriptStep(game, now);
}

export function robotNow(round, now) {
  const shown = round.run ?? round.finished ?? round.failed;
  if (shown) return poseAt(shown, shown.start, now);
  const { x, y, dir } = startOf(round.level);
  return { x, y, dir, turn: 0, pose: "idle", done: true };
}
