import { CAMERA, PLAYER_SCREEN_POSITION, VIEW_WIDTH } from './tuning.js';
import { sceneryFor, groundColor } from './scenery.js';
import { targetZoom, nextZoom } from './camera.js';
import { drawWorld, onStage } from './draw-world.js';
import { drawHud, drawTouch, HUD_BOTTOM } from './draw-hud.js';
import { DAY_THEME, drawLevelCard, levelCardGoButton, levelCardGarageButton, levelCardRobotButton, drawGarage, drawGiftReveal } from './art.js';

const NO_HUD = { hint: false, touch: null, vehicle: undefined, screen: null, garageHint: false, card: null, rival: null };

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { canvasWidth: 1, canvasHeight: 1, offsetX: 0, width: 1, height: 1, dpr: 1, scale: 1, zoom: 1, lastTime: null, theme: DAY_THEME };
  return {
    resize({ width, height, dpr, stage }) {
      Object.assign(view, {
        canvasWidth: width, canvasHeight: height, dpr,
        offsetX: stage.x, width: stage.width, height: stage.height, scale: stage.width / VIEW_WIDTH,
      });
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    },
    retheme(theme) {
      view.theme = theme;
    },
    get zoom() {
      return view.zoom;
    },
    pixelsPerUnit: () => view.scale * view.zoom,
    hudBottom: () => HUD_BOTTOM,
    goButton: () => goButtonRect(view),
    garageButton: () => onCanvas(view, levelCardGarageButton(view.width, view.height)),
    robotButton: () => onCanvas(view, levelCardRobotButton(view.width, view.height)),
    screenSize: () => ({ width: view.canvasWidth, height: view.canvasHeight }),
    draw: (game, time, hud = NO_HUD) => drawFrame(ctx, view, game, time, { ...NO_HUD, ...hud }),
  };
}

function drawFrame(ctx, view, game, time, hud) {
  updateZoom(view, hud.card ? null : game, time);
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  if (!game && !hud.card) {
    fillAll(ctx, view, view.theme.ground.sky);
    return;
  }
  if (hud.screen?.name === 'garage') {
    drawGarage(ctx, { width: view.canvasWidth, height: view.canvasHeight, ...hud.screen.view }, view.theme);
    return;
  }
  if (hud.screen?.name === 'gift') {
    fillAll(ctx, view, view.theme.ground.sky);
    onStage(ctx, view, 1);
    drawGiftReveal(ctx, { width: view.width, height: view.height, ...hud.screen.view }, view.theme);
    return;
  }
  if (hud.card || game.state === 'ready') {
    drawCard(ctx, view, game, time, hud);
    return;
  }
  fillAll(ctx, view, groundColor(sceneryFor(game.level), view.theme.ground));
  drawWorld(ctx, view, game, hud.vehicle, hud.rival);
  drawHud(ctx, view, game, time, hud);
  drawTouch(ctx, view, hud.touch);
}

function fillAll(ctx, view, color) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, view.canvasWidth, view.canvasHeight);
}

function updateZoom(view, game, time) {
  const dt = view.lastTime === null ? 0 : Math.max(0, Math.min(0.1, time - view.lastTime));
  view.lastTime = time;
  if (!game || game.state === 'ready') {
    view.zoom = 1;
    return;
  }
  const lookAheadPx = view.height * PLAYER_SCREEN_POSITION - HUD_BOTTOM;
  const speed = game.player.speed;
  const target = targetZoom({ lookAheadPx, scale: view.scale, speed, minSeconds: CAMERA.minLookAheadSeconds });
  view.zoom = nextZoom(view.zoom, target, dt, CAMERA.zoomInPerSecond);
}

function drawCard(ctx, view, game, time, { vehicle, garageHint, card }) {
  fillAll(ctx, view, view.theme.ground.sky);
  onStage(ctx, view, 1);
  const duel = card ? { level: card.level, result: card.result, rival: card.rival, meReady: card.meReady, offerRobot: card.offerRobot } : {};
  drawLevelCard(ctx, {
    width: view.width, height: view.height, level: game?.level, result: game?.lastResult ?? 'start', time, vehicle,
    garageHint: Boolean(garageHint && !card && !game.lastResult), ...duel,
  }, view.theme);
}

function onCanvas(view, box) {
  return { ...box, x: box.x + view.offsetX, centerX: box.centerX + view.offsetX };
}

function goButtonRect(view) {
  return onCanvas(view, levelCardGoButton(view.width, view.height));
}
