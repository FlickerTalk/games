import { FLICK, standIn } from "../../../kit/src/avatars/index.js";
import { centreOf, drawHintHand, drawPause, pauseLayout } from "../../../kit/src/canvas/index.js";
import { fadeEdges, paint, roundedRect, withRim } from "../../../kit/src/canvas/pen.js";
import { drawBar } from "./bar-art.js";
import { drawCommandButton, drawStrip } from "./command-art.js";
import { robotNow } from "./driving.js";
import { drawCollectBurst, drawDustPuff, drawPopRing } from "./effects-art.js";
import { stepsDone } from "./motion.js";
import { ringState } from "./program.js";
import { drawRobot } from "./robot-art.js";
import { cellsOfKind, fullMask, startOf } from "./run.js";
import { drawTile } from "./tiles-art.js";
import { drawWorld } from "./world-art.js";

const HINT_LOOP = 1.6;
const progressOf = (moment, time) => Math.min(1, Math.max(0, (time * 1000 - moment.start) / moment.duration));

export const rimmed = (ctx, theme, draw) => withRim(ctx, { ink: theme.art.ink, colour: theme.art.rim }, draw);

export function drawStage(ctx, state, theme, time) {
  drawWorld(ctx, state.progress.chosen.world, { x: 0, y: 0, w: state.width, h: state.height }, theme, time);
  fadeEdges(ctx, state.width, state.height, theme.ui.page);
}

export function driverOf(state) {
  const { round, player } = state;
  if (round?.driver === "flick") return { look: "capsule", face: { who: FLICK.id } };
  if (round?.driver === "friend") return { look: "ball", face: standIn(player) };
  return { look: state.progress.chosen.robot, face: player };
}

export function rivalOf(state) {
  const { round, mode, player } = state;
  const typing = Boolean(round?.script?.length) && !round.run;
  if (round?.driver === "flick" || round?.maker === "flick" || mode === "flick") return { player: { who: FLICK.id }, thinking: typing };
  if (round?.driver === "friend" || round?.maker === "friend" || mode === "friend") return { player: standIn(player), thinking: typing };
  return null;
}

function inventory(round, nowMs) {
  const shown = round.run ?? round.finished ?? round.failed;
  if (!shown) return startOf(round.level);
  const done = stepsDone(shown, shown.start, nowMs);
  if (done >= shown.steps.length) return shown.state;
  return done > 0 ? shown.steps[done - 1].to : startOf(round.level);
}

export function drawBoard(ctx, layout, level, theme, { world, time, got = 0, opened = 0 }) {
  const { frame, board } = layout;
  const look = theme.art.worlds[world] ?? theme.art.worlds.workshop;
  const batteries = cellsOfKind(level, "B");
  const doors = cellsOfKind(level, "D");
  const powered = got === fullMask(level);
  roundedRect(ctx, frame.x, frame.y, frame.w, frame.h, Math.min(18, frame.w * 0.06));
  paint(ctx, look.floor, theme.art.ink, theme.stroke.base);
  for (let at = 0; at < level.cells.length; at += 1) {
    const x = board.x + (at % level.size) * board.cell;
    const y = board.y + Math.floor(at / level.size) * board.cell;
    const collected = Boolean(got & (1 << batteries.indexOf(at)));
    drawTile(ctx, level.cells[at], x, y, board.cell, theme, { world, time, powered, open: Boolean(opened & (1 << doors.indexOf(at))), collected: batteries.includes(at) && collected });
  }
}

function moments(ctx, state, theme, time) {
  const { board } = state.layout;
  for (const moment of state.moments) {
    const x = board.x + (moment.x + 0.5) * board.cell;
    const y = board.y + (moment.y + 0.5) * board.cell;
    const t = progressOf(moment, time);
    if (moment.kind === "burst") drawCollectBurst(ctx, x, y, board.cell, t, theme);
    if (moment.kind === "dust") drawDustPuff(ctx, x, y, board.cell, t, theme);
    if (moment.kind === "ripple") drawPopRing(ctx, x, y, board.cell, t, theme);
  }
}

function iconOf(target, round) {
  if (target.kind === "command") return target.value;
  if (target.kind === "undo") return "undo";
  const now = ringState(round.edit);
  if (now === "open") return "close";
  return now === "empty" ? `ring${round.edit.items.at(-1).times}` : "ring2";
}

function buttons(ctx, state, theme) {
  const { round, layout, press } = state;
  const idle = round.driver !== "me" || Boolean(round.finished);
  for (const target of layout.buttons) {
    const pressed = Boolean(press && press.kind === target.kind && press.value === target.value);
    if (target.kind === "play") drawCommandButton(ctx, target, round.run ? "stop" : "play", theme, { primary: true, pressed, dim: idle });
    else drawCommandButton(ctx, target, iconOf(target, round), theme, { pressed, chosen: target.kind === "ring" && ringState(round.edit) !== "none", dim: idle || Boolean(round.run) });
  }
}

export function drawHint(ctx, state, theme, time) {
  const aim = state.hint && state.layout.buttons.find((one) => one.kind === state.hint.kind && one.value === state.hint.value);
  if (!aim) return;
  const [x, y] = centreOf(aim);
  drawHintHand(ctx, x + aim.w * 0.12, y + aim.h * 0.42, Math.min(72, aim.w * 0.8), (time % HINT_LOOP) / HINT_LOOP, theme.ui);
}

export function barShown(state, { level, got = 0 } = {}) {
  const total = level ? cellsOfKind(level, "B").length : 0;
  return { sound: state.sound, press: state.press, lang: state.lang, level: state.screen === "play" ? state.progress.level : null, batteries: { total, got }, rival: rivalOf(state) };
}

export function drawPlay(ctx, state, theme, time) {
  const { round, layout } = state;
  if (!round || !layout) return;
  const now = time * 1000;
  const held = inventory(round, now);
  const robot = robotNow(round, now);
  const world = state.progress.chosen.world;
  const running = round.run ? round.run.steps[Math.min(robot.index ?? 0, round.run.steps.length - 1)]?.slot ?? null : null;
  ctx.save();
  drawStage(ctx, state, theme, time);
  rimmed(ctx, theme, () => {
    drawBoard(ctx, layout, round.level, theme, { world, time, got: held.got, opened: held.opened });
    const { board } = layout;
    drawRobot(ctx, board.x + (robot.x + 0.5) * board.cell, board.y + (robot.y + 0.5) * board.cell, board.cell * 0.82, { ...driverOf(state), dir: robot.dir + robot.turn, pose: robot.pose, time }, theme);
    moments(ctx, state, theme, time);
  });
  drawStrip(ctx, layout.strip, round.edit, { running, wrong: round.wrong }, theme, time);
  buttons(ctx, state, theme);
  drawBar(ctx, layout, barShown(state, { level: round.level, got: held.got }), theme, time);
  if (!state.paused) drawHint(ctx, state, theme, time);
  if (state.paused) drawPause(ctx, state, theme.ui, { layout: pauseLayout(state.width, state.height, { fill: state.fill }) });
  ctx.restore();
}
