import { PLAYER_SCREEN_POSITION } from './tuning.js';
import { SWITCH_ROOM } from './layout.js';
import { raceProgress } from './game.js';
import { placeHint } from './hint.js';
import { onStage } from './draw-world.js';
import { drawProgressStrip, drawCountdown, drawTouchHint, drawTouchPoint } from './art.js';

const STRIP = { top: 14, height: 58, widthShare: 0.74 };
const LIGHTS = { red: 0.5, amber: 1.5, green: 2.5, off: 3.5 };

export const HUD_BOTTOM = STRIP.top + STRIP.height;

export function drawHud(ctx, view, game, time, hud) {
  onStage(ctx, view, 1);
  const stripWidth = Math.min(view.width * STRIP.widthShare, view.width - SWITCH_ROOM * 2);
  const progress = raceProgress(game);
  const { rival } = hud;
  if (rival) progress.robot = Math.min(1, Math.max(0, rival.distance / game.track.length));
  const friend = rival ? { kind: rival.kind, color: rival.color } : null;
  const marks = { halfway: game.track.halfway === null ? null : 0.5 };
  drawProgressStrip(ctx, (view.width - stripWidth) / 2, STRIP.top, stripWidth, STRIP.height, progress, hud.vehicle, friend, marks);
  const light = lightFor(game);
  if (light !== null) {
    drawCountdown(ctx, view.width / 2, HUD_BOTTOM + view.height * 0.12, Math.min(220, view.width * 0.55), { time: light });
  }
  const underWay = game.state === 'countdown' || game.state === 'racing';
  if (game.state === 'paused' || (hud.hint && underWay)) drawHintBelowCar(ctx, view, game.player, time);
}

function lightFor(game) {
  if (game.state === 'countdown') return game.timer > game.countdownLength / 2 ? LIGHTS.red : LIGHTS.amber;
  if (game.state === 'racing' && game.goLight > 0) return LIGHTS.green;
  if (game.state === 'paused') return LIGHTS.off;
  return null;
}

function drawHintBelowCar(ctx, view, car, time) {
  const pixels = view.scale * view.zoom;
  const carBottom = view.height * PLAYER_SCREEN_POSITION + (car.length * pixels) / 2;
  const spot = placeHint({ width: view.width, height: view.height, carX: view.width / 2 + car.x * pixels, carBottom });
  drawTouchHint(ctx, spot.x, spot.y, spot.size, { time });
}

export function drawTouch(ctx, view, touch) {
  if (!touch || touch.x === null || touch.y === null) return;
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  drawTouchPoint(ctx, touch.x, touch.y, { pressed: touch.pressed, time: touch.time });
}
