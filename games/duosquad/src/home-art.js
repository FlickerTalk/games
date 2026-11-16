import { standIn } from "../../../kit/src/avatars/index.js";
import { centreOf, drawHome as drawHomeScreen, drawLooks as drawLooksScreen, drawPresent } from "../../../kit/src/canvas/index.js";
import { clamp, fadeEdges } from "../../../kit/src/canvas/pen.js";
import { drawLobby, lobbyOf } from "../../../kit/src/duel/lobby.js";
import { drawPilot } from "./board.js";
import { homeOf, looksOf } from "./game.js";
import { HULLS, PAGE, PROGRESS, WORLDS, ZONES, hullOf, zoneFor } from "./levels.js";
import { lookFor } from "./theme.js";
import { artOf } from "./worlds.js";

const FLICK = Object.freeze({ who: "flick" });
const ESCORT = ["scout", "weaver", "elite"];

const hullIndex = (state, world) => HULLS[world].indexOf(hullOf(state.progress, world));

export function drawCraftWith(ctx, x, y, size, { world, hull, seat = 0, player = null }, theme, time) {
  const art = artOf(world);
  art.drawCraft(ctx, x, y, size, hull, lookFor(theme, world), { seat, time, bank: 0, caught: false });
  if (!player) return;
  const [dx, dy] = art.cockpitOf(hull);
  drawPilot(ctx, x + dx * size, y + dy * size, size, player, "happy", theme.ui, time);
}

const teammate = (state) => (state.mode === "friend" ? standIn(state.player) : FLICK);

function stage(ctx, band, state, theme, time) {
  const { width, height, world } = state;
  const art = artOf(world);
  const look = lookFor(theme, world);
  art.drawScenery(ctx, { x: 0, y: 0, w: width, h: height }, zoneFor(world, state.progress.level), look, time);
  fadeEdges(ctx, width, height, theme.ui.page);
  if (band.h < 70) return;
  const size = clamp(band.h * 0.5, 36, 84);
  const middle = band.y + band.h / 2;
  ESCORT.forEach((kind, at) => art.drawEnemy(ctx, width / 2 + (at - 1) * size * 1.5, middle - size * 0.45, size * 0.7, kind, look, { time: time + at, variant: at }));
  const mine = hullIndex(state, world);
  drawCraftWith(ctx, width / 2 - size * 0.8, middle + size * 0.5, size, { world, hull: mine, seat: 0, player: state.player }, theme, time);
  drawCraftWith(ctx, width / 2 + size * 0.8, middle + size * 0.5, size, { world, hull: (mine + 3) % 8, seat: 1, player: teammate(state) }, theme, time + 1);
}

function variant(ctx, target, state, theme, time) {
  const [x, y] = centreOf(target);
  const world = target.value;
  const size = Math.min(target.w, target.h);
  artOf(world).drawEnemy(ctx, x + size * 0.18, y - size * 0.2, size * 0.34, "scout", lookFor(theme, world), { time, variant: 0 });
  drawCraftWith(ctx, x - size * 0.08, y + size * 0.12, size * 0.5, { world, hull: hullIndex(state, world) }, theme, time);
}

function seatOf(game) {
  const { state, duel } = game;
  if (state.mode !== "friend" || !duel) return { player: FLICK, here: true, calling: false, away: false };
  const { here, calling, away } = duel.status;
  return { player: standIn(state.player), here, calling, away };
}

export function drawHome(ctx, game, theme, time) {
  const { state } = game;
  const layout = homeOf(state);
  drawHomeScreen(ctx, { ...state, variant: state.world }, theme.ui, time, {
    layout,
    seat: seatOf(game),
    volume: state.layout?.volume,
    drawStage: (pen, band) => stage(pen, band, state, theme, time),
    drawVariant: (pen, target) => variant(pen, target, state, theme, time),
  });
  const at = (kind) => layout.targets.find((one) => one.kind === kind);
  drawLobby(ctx, { play: at("play"), rival: at("rival") }, lobbyOf(game.duel?.status), theme.ui, time);
}

export function drawLookArt(ctx, area, look, theme, time) {
  const world = WORLDS.find((one) => HULLS[one].includes(look)) ?? WORLDS[0];
  const [x, y] = centreOf(area);
  const inset = Math.max(8, area.w * 0.1);
  artOf(world).drawScenery(ctx, { x: area.x + inset, y: area.y + inset, w: area.w - 2 * inset, h: area.h - 2 * inset }, ZONES[world][0], lookFor(theme, world), 0);
  drawCraftWith(ctx, x, y, Math.min(area.w, area.h) * 0.56, { world, hull: Math.max(0, HULLS[world].indexOf(look)) }, theme, time);
}

export const drawWrapped = (ctx, area, shake, theme) => drawPresent(ctx, area, shake, theme.art.gift);

function shakeOf(state, index, time) {
  const moment = state.moments.find((one) => one.kind === "shake" && one.index === index);
  return moment ? clamp((time * 1000 - moment.start) / moment.duration) : 0;
}

export function drawLooks(ctx, state, theme, time) {
  drawLooksScreen(ctx, state, theme.ui, time, {
    layout: looksOf(state),
    kind: state.page,
    looks: HULLS[state.world].slice(state.page * PAGE, (state.page + 1) * PAGE),
    owned: PROGRESS.owned(state.progress),
    chosen: hullOf(state.progress, state.world),
    shake: (index) => shakeOf(state, index, time),
    drawLook: (pen, area, look, now) => drawLookArt(pen, area, look, theme, now),
    drawTab: (pen, target, page, now) => drawCraftWith(pen, ...centreOf(target), target.w * 0.5, { world: state.world, hull: page * PAGE }, theme, now),
    drawWrapped: (pen, area, shake) => drawWrapped(pen, area, shake, theme),
  });
}
