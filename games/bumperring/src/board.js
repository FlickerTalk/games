import { standIn } from "../../../kit/src/avatars/index.js";
import { DIGITS, drawDigits, drawPause, formatNumber, pauseLayout } from "../../../kit/src/canvas/index.js";
import { circle, clamp, ease, fadeEdges } from "../../../kit/src/canvas/pen.js";
import { FALL_SHOW, OUT, chargeOf, poseOf } from "./body.js";
import { drawBumpStar, drawBurst, drawSplash, drawTapHand } from "./effects.js";
import { drawDashButton, drawPlayBar, drawShells } from "./hud.js";
import { FIGURE, footOf } from "./layout.js";
import { radiusNow, scoreOf } from "./match.js";
import { drawArrow, drawPlayer } from "./players.js";
import { leftOf } from "./rounds.js";
import { drawPlace, drawPlatform } from "./scenery.js";
import { bodyOf } from "./touch.js";

const HINT_LOOP = 1.6;
const FLICK = Object.freeze({ who: "flick" });
const AIMING = ["idle", "back", "charging", "dash"];
// how far below the platform's top the water is, in platform radii
const WATER = 0.2;

const progressOf = (moment, time) => clamp((time * 1000 - moment.start) / moment.duration);

function whoOf(state, seat) {
  const { round, player } = state;
  if (seat === round.seat) return player;
  return round.kind === "flick" ? FLICK : standIn(player);
}

function sunk(body, place) {
  if (body.out <= 0) return 0;
  const fallen = clamp((OUT - body.out) / FALL_SHOW);
  return place === "cloud" ? fallen * 0.7 * WATER + ((OUT - body.out) / OUT) * WATER : ease(fallen) * WATER;
}

export function actorsOf(state, time) {
  const { round, layout } = state;
  const turn = round.seat === 0 ? 1 : -1;
  const actors = round.match.bodies.map((body, seat) => {
    const [x, y] = footOf(layout, body.x, body.y, round.seat);
    const cheering = state.moments.some((one) => one.kind === "point" && one.seat === seat && progressOf(one, time) < 1);
    const stood = poseOf(body);
    const pose = cheering && (stood === "idle" || stood === "back") ? "cheer" : stood;
    const aim = { x: body.ax * turn, y: body.ay * turn };
    return {
      seat, x, y: y + sunk(body, round.place) * layout.platform.r, pose, mine: seat === round.seat,
      who: whoOf(state, seat), ring: round.looks[seat], charge: chargeOf(body), flip: aim.x < 0,
      arrow: AIMING.includes(pose) ? aim : null, behind: body.out > 0 && body.y * turn < 0, depth: body.y * turn,
    };
  });
  return actors.sort((one, two) => Number(two.mine) - Number(one.mine));
}

function actor(ctx, state, one, theme, time) {
  const size = FIGURE * state.layout.platform.r;
  if (one.arrow) drawArrow(ctx, one.x, one.y, size, one.arrow, theme, { mine: one.mine, charge: one.charge });
  drawPlayer(ctx, one.x, one.y, size, one.who, theme, { ring: one.ring, pose: one.pose, charge: one.charge, time: time + one.seat * 0.7, flip: one.flip, place: state.round.place });
}

function moments(ctx, state, theme, time) {
  const { round, layout } = state;
  const { r } = layout.platform;
  for (const moment of state.moments) {
    const t = progressOf(moment, time);
    const [x, y] = footOf(layout, moment.x ?? 0, moment.y ?? 0, round.seat);
    if (moment.kind === "bump") drawBumpStar(ctx, x, y - r * 0.2, r * Math.min(0.5, 0.24 + (moment.power ?? 1) * 0.1), t, theme);
    if (moment.kind === "fall" && round.place !== "cloud") drawSplash(ctx, x, y + WATER * r, r * 0.5, t, theme);
    if (moment.kind === "point") drawBurst(ctx, x, y - r * FIGURE * 1.25, r * 0.4, t, theme);
    if (moment.kind === "boing" || moment.kind === "bar") drawBurst(ctx, x, y, r * 0.3, t, theme);
  }
}

function scene(ctx, state, theme, time) {
  const { round, layout } = state;
  const { x, y, r } = layout.platform;
  const actors = actorsOf(state, time).sort((one, two) => one.depth - two.depth);
  for (const one of actors.filter((each) => each.behind)) actor(ctx, state, one, theme, time);
  drawPlatform(ctx, x, y, r, theme, { variant: round.match.variant, size: radiusNow(round.match), bar: round.match.bar, turn: round.seat === 0 ? 1 : -1 });
  for (const one of actors.filter((each) => !each.behind)) actor(ctx, state, one, theme, time);
  moments(ctx, state, theme, time);
}

function controls(ctx, state, theme, time) {
  const { round, layout } = state;
  const { platform } = layout;
  layout.dash.forEach((area, slot) => {
    const body = bodyOf(round, slot);
    const [cx, cy] = [area.x + area.w / 2, area.y + area.h / 2];
    const far = Math.hypot(platform.x - cx, platform.y - cy) || 1;
    drawDashButton(ctx, area, theme, { charge: chargeOf(body), pressed: body.down, toward: [(platform.x - cx) / far, (platform.y - cy) / far] });
  });
  drawShells(ctx, layout.shells[0].x, layout.shells[0].y, scoreOf(round.match, round.seat), theme);
  drawShells(ctx, layout.shells[1].x, layout.shells[1].y, scoreOf(round.match, 1 - round.seat), theme, { turned: round.kind === "pair" && !layout.side });
  if (state.taught) return;
  const mine = layout.dash[0];
  const size = Math.min(84, mine.w * 0.62);
  drawTapHand(ctx, mine.x + mine.w * 0.56, mine.y + mine.h * 0.5 + size * 0.5, size, (time % HINT_LOOP) / HINT_LOOP, theme);
}

function countdown(ctx, state, theme, now) {
  const { round, layout } = state;
  const left = round.startAt - now;
  if (left <= 0) return;
  const { x, y, r } = layout.platform;
  const size = Math.min(88, r * 0.8);
  circle(ctx, x, y, size / 2, theme.ui.surface, theme.ui.border, theme.ui.line);
  drawDigits(ctx, formatNumber(Math.ceil(left / 1000), state.lang), x, y, Math.max(DIGITS.best, Math.min(DIGITS.big, size * 0.5)), theme.ui.text, "center");
}

export function drawPlay(ctx, game, theme, time) {
  const { state } = game;
  const { round, layout } = state;
  if (!round || !layout) return;
  drawPlace(ctx, { x: 0, y: 0, w: state.width, h: state.height }, round.place, theme, time);
  fadeEdges(ctx, state.width, state.height, theme.ui.page);
  scene(ctx, state, theme, time);
  controls(ctx, state, theme, time);
  countdown(ctx, state, theme, game.now());
  drawPlayBar(ctx, layout, { me: state.player, rival: whoOf(state, 1 - round.seat), left: leftOf(round), sound: state.sound, press: state.press, lang: state.lang }, theme, time);
  if (state.paused) drawPause(ctx, state, theme.ui, { layout: pauseLayout(state.width, state.height, { fill: state.fill }) });
}
