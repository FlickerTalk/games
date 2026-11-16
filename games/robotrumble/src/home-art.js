import { centreOf, drawHome as drawHomeScreen, drawLooks as drawLooksScreen, drawPresent, homeLayout, looksLayout } from "../../../kit/src/canvas/index.js";
import { clamp } from "../../../kit/src/canvas/pen.js";
import { drawLobby, lobbyOf } from "../../../kit/src/duel/lobby.js";
import { rivalColour, rivalOf } from "./board.js";
import { VARIANTS } from "./game.js";
import { LOOKS, PROGRESS, rivalRobot } from "./levels.js";
import { drawRobot } from "./robots.js";
import { drawStage, drawStageIcon } from "./stages.js";

const TABS = Object.keys(LOOKS);
const SOUND = ["speaker", "music", "volume"];

function rowsOf(targets) {
  const rows = [];
  for (const { y, h } of [...targets].sort((one, two) => one.y - two.y)) {
    const last = rows.at(-1);
    if (last && y <= last.bottom) last.bottom = Math.max(last.bottom, y + h);
    else rows.push({ top: y, bottom: y + h });
  }
  return rows;
}

export function stageArea(state, targets) {
  const sound = targets.filter((one) => SOUND.includes(one.kind));
  const start = Math.max(8, ...sound.map((one) => one.y + one.h)) + 8;
  const rows = rowsOf(targets.filter((one) => !SOUND.includes(one.kind)));
  let best = { top: start, bottom: rows[0]?.top ?? state.height };
  rows.forEach((row, at) => {
    const bottom = rows[at + 1]?.top ?? row.bottom;
    if (bottom - row.bottom > best.bottom - best.top) best = { top: row.bottom, bottom };
  });
  return { x: 0, y: best.top + 8, w: state.width, h: Math.max(0, best.bottom - best.top - 16) };
}

function drawStageBand(ctx, state, band, theme, time) {
  const size = Math.min(band.h * 0.56, band.w / 3.4, 150);
  if (size < 44) return;
  const kind = state.mode === "flick" ? "flick" : "friend";
  const mine = state.progress.chosen.robot;
  const ground = band.y + band.h * 0.84;
  const middle = band.x + band.w / 2;
  drawStage(ctx, band, ground, state.progress.chosen.stage, theme);
  drawRobot(ctx, middle + size * 0.8, ground, size, theme, { variant: rivalRobot(mine), colour: rivalColour(kind), facing: -1, time, phase: 1.7, player: rivalOf(kind, state.player) });
  drawRobot(ctx, middle - size * 0.8, ground, size, theme, { variant: mine, time, player: state.player });
}

function drawVariant(ctx, target, state, theme, time) {
  const [x, y] = centreOf(target);
  const size = Math.min(target.w, target.h);
  const mine = state.progress.chosen.robot;
  const feet = y + size * 0.34;
  if (target.value === "flick") {
    drawRobot(ctx, x, feet, size * 0.56, theme, { variant: rivalRobot(mine), colour: "grape", time, player: rivalOf("flick", state.player) });
    return;
  }
  drawRobot(ctx, x + size * 0.2, feet, size * 0.4, theme, { variant: rivalRobot(mine), colour: "mint", facing: -1, time, player: rivalOf("pair", state.player) });
  drawRobot(ctx, x - size * 0.2, feet, size * 0.4, theme, { variant: mine, time, player: state.player });
}

function seatOf(game) {
  const { state, duel } = game;
  if (state.mode === "flick") return { player: rivalOf("flick", state.player), here: true, calling: false, away: false };
  if (state.mode !== "friend" || !duel) return null;
  const { here, calling, away } = duel.status;
  return { player: rivalOf("friend", state.player), here, calling, away };
}

export function drawHome(ctx, game, theme, time) {
  const { state } = game;
  const seat = seatOf(game);
  const layout = homeLayout(state.width, state.height, { variants: state.mode === "alone" ? VARIANTS : [], rival: Boolean(seat), fill: state.fill });
  const shown = { ...state, variant: state.mode === "alone" ? state.variant : null };
  drawHomeScreen(ctx, shown, theme.ui, time, {
    layout,
    seat,
    volume: state.layout?.volume,
    drawStage: (pen) => drawStageBand(pen, state, stageArea(state, layout.targets), theme, time),
    drawVariant: (pen, target) => drawVariant(pen, target, state, theme, time),
  });
  const at = (kind) => layout.targets.find((one) => one.kind === kind);
  drawLobby(ctx, { play: at("play"), rival: at("rival") }, lobbyOf(game.duel?.status), theme.ui, time);
}

export function drawLookArt(ctx, area, kind, look, theme, { time, player }) {
  if (kind === "stage") return drawStageIcon(ctx, look, area, theme);
  const [x] = centreOf(area);
  return drawRobot(ctx, x, area.y + area.h * 0.86, area.h * 0.6, theme, { variant: look, time, player });
}

function shakeOf(state, index, time) {
  const moment = state.moments.find((one) => one.kind === "shake" && one.index === index);
  return moment ? clamp((time * 1000 - moment.start) / moment.duration) : 0;
}

export function drawLooks(ctx, state, theme, time) {
  const kind = state.looks;
  const looks = LOOKS[kind];
  const { player } = state;
  drawLooksScreen(ctx, state, theme.ui, time, {
    layout: looksLayout(state.width, state.height, { kind, count: looks.length, fill: state.fill, tabs: TABS }),
    kind,
    looks,
    owned: PROGRESS.owned(state.progress),
    chosen: state.progress.chosen[kind],
    shake: (index) => shakeOf(state, index, time),
    drawLook: (pen, area, look, now) => drawLookArt(pen, area, kind, look, theme, { time: now, player }),
    drawTab: (pen, area, value) => drawLookArt(pen, { x: area.x + 8, y: area.y + 8, w: area.w - 16, h: area.h - 16 }, value, LOOKS[value][0], theme, { time, player }),
    drawWrapped: (pen, area, shake) => drawPresent(pen, area, shake, theme.art.gift),
  });
}
