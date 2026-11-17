import { drawRobotCar } from './art-cars.js';
import { drawGarageButton } from './art-garage.js';
import { drawPlayerVehicle } from './art-vehicles.js';
import { drawConfetti } from './art-effects.js';
import { DAY_THEME, PALETTE } from './art-palette.js';
import { clamp, ellipse, paint, polygon, roundedRect, starPoints } from './art-shapes.js';
import { SWITCH_BAND } from './layout.js';

export function levelCardGoButton(width, height) {
  const radius = clamp(width * 0.13, 46, 54);
  const centerX = width / 2;
  const centerY = Math.min(height - radius - 34, height * 0.82);
  return {
    x: centerX - radius,
    y: centerY - radius,
    width: radius * 2,
    height: radius * 2,
    centerX,
    centerY,
    radius
  };
}

function drawStartIcon(ctx, x, y, size, ink) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(-size * 0.32, -size * 0.43);
  ctx.lineTo(-size * 0.32, size * 0.44);
  ctx.strokeStyle = ink;
  ctx.lineWidth = size * 0.065;
  ctx.lineCap = 'round';
  ctx.stroke();
  const cell = size * 0.18;
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      ctx.fillStyle = (row + column) % 2 ? PALETTE.white : PALETTE.ink;
      ctx.fillRect(-size * 0.27 + column * cell, -size * 0.4 + row * cell, cell, cell);
    }
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(-size * 0.27, -size * 0.4, cell * 4, cell * 3);
  ellipse(ctx, -size * 0.32, size * 0.45, size * 0.18, size * 0.07, PALETTE.playerDark, PALETTE.ink, 2);
  ctx.restore();
}

function drawTrophy(ctx, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(side * size * 0.28, -size * 0.15, size * 0.2, side < 0 ? Math.PI * 0.5 : -Math.PI * 0.5, side < 0 ? Math.PI * 1.5 : Math.PI * 0.5);
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = size * 0.11;
    ctx.stroke();
    ctx.strokeStyle = PALETTE.trophy;
    ctx.lineWidth = size * 0.06;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-size * 0.29, -size * 0.36);
  ctx.lineTo(size * 0.29, -size * 0.36);
  ctx.quadraticCurveTo(size * 0.25, size * 0.12, 0, size * 0.18);
  ctx.quadraticCurveTo(-size * 0.25, size * 0.12, -size * 0.29, -size * 0.36);
  ctx.closePath();
  paint(ctx, PALETTE.trophy, PALETTE.ink, 3.5);
  roundedRect(ctx, -size * 0.045, size * 0.13, size * 0.09, size * 0.23, size * 0.03);
  paint(ctx, PALETTE.trophy, PALETTE.ink, 2.5);
  roundedRect(ctx, -size * 0.23, size * 0.31, size * 0.46, size * 0.14, size * 0.05);
  paint(ctx, PALETTE.playerDark, PALETTE.ink, 3);
  polygon(ctx, starPoints(0, -size * 0.1, size * 0.14, size * 0.065), PALETTE.white, null);
  ctx.restore();
}

function drawRetryIcon(ctx, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.34, Math.PI * 0.15, Math.PI * 1.75);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = size * 0.14;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.strokeStyle = PALETTE.playerGlass;
  ctx.lineWidth = size * 0.08;
  ctx.stroke();
  polygon(ctx, [[size * 0.25, -size * 0.4], [size * 0.46, -size * 0.3], [size * 0.25, -size * 0.15]], PALETTE.playerGlass, PALETTE.ink, 3);
  ctx.beginPath();
  ctx.moveTo(0, size * 0.22);
  ctx.bezierCurveTo(-size * 0.35, size * 0.02, -size * 0.2, -size * 0.23, 0, -size * 0.08);
  ctx.bezierCurveTo(size * 0.2, -size * 0.23, size * 0.35, size * 0.02, 0, size * 0.22);
  paint(ctx, PALETTE.trafficRed, PALETTE.ink, 2.5);
  ctx.restore();
}

function drawReadyMark(ctx, x, y, radius) {
  ellipse(ctx, x, y, radius, radius, PALETTE.greenLight, PALETTE.ink, 2.5);
  ctx.beginPath();
  ctx.moveTo(x - radius * 0.45, y);
  ctx.lineTo(x - radius * 0.1, y + radius * 0.35);
  ctx.lineTo(x + radius * 0.5, y - radius * 0.38);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = Math.max(2.5, radius * 0.22);
  ctx.lineCap = 'round';
  ctx.stroke();
}

function drawGoneMark(ctx, x, y, radius) {
  ellipse(ctx, x, y, radius, radius, PALETTE.trafficRed, PALETTE.ink, 2.5);
  ctx.beginPath();
  for (const side of [-1, 1]) {
    ctx.moveTo(x - radius * 0.38, y - side * radius * 0.38);
    ctx.lineTo(x + radius * 0.38, y + side * radius * 0.38);
  }
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = Math.max(2.5, radius * 0.22);
  ctx.lineCap = 'round';
  ctx.stroke();
}

function drawEmptySeat(ctx, x, y, size, status, time) {
  const width = size * 0.42;
  const height = size * 0.68;
  ctx.save();
  ctx.globalAlpha = ['asleep', 'gone'].includes(status) ? 0.4 : 1;
  ctx.setLineDash([6, 5]);
  roundedRect(ctx, x - width / 2, y - height / 2, width, height, width * 0.3);
  paint(ctx, null, PALETTE.hub, 3);
  ctx.setLineDash([]);
  for (let dot = 0; dot < 3; dot += 1) {
    const hop = status === 'calling' ? Math.max(0, Math.sin(time * 6 - dot * 0.9)) * size * 0.06 : 0;
    ellipse(ctx, x + (dot - 1) * width * 0.3, y - hop, size * 0.035, size * 0.035, PALETTE.hub, null);
  }
  ctx.restore();
}

function drawRival(ctx, x, y, size, time, rival) {
  if (!rival) {
    drawRobotCar(ctx, x, y, size * 0.4, size * 0.64, { steer: -0.15, time });
    return;
  }
  if (!rival.vehicle || !['here', 'ready'].includes(rival.status)) {
    drawEmptySeat(ctx, x, y, size, rival.status, time);
    if (rival.status === 'gone') drawGoneMark(ctx, x + size * 0.2, y - size * 0.3, size * 0.11);
    return;
  }
  drawPlayerVehicle(ctx, x, y, size * 0.42, size * 0.68, { ...rival.vehicle, steer: -0.15, time });
  if (rival.status === 'ready') drawReadyMark(ctx, x + size * 0.2, y - size * 0.3, size * 0.11);
}

function drawRacePair(ctx, x, y, size, { time, result, vehicle, rival, meReady }) {
  const bob = Math.sin(time * 3) * size * 0.025;
  const spacing = size * 0.52;
  if (result === 'lost') {
    for (const side of [-1, 1]) {
      polygon(ctx, starPoints(x + side * size * 0.86, y - size * 0.25, size * 0.11, size * 0.05), PALETTE.playerLight, PALETTE.ink, 1.5);
    }
  }
  drawPlayerVehicle(ctx, x - spacing, y + bob, size * 0.42, size * 0.68, { ...vehicle, steer: 0.15, time });
  if (meReady) drawReadyMark(ctx, x - spacing + size * 0.2, y + bob - size * 0.3, size * 0.11);
  drawRival(ctx, x + spacing, y - bob, size, time, rival);
}

function drawMedal(ctx, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  for (const side of [-1, 1]) {
    polygon(ctx, [[side * size * 0.06, -size * 0.5], [side * size * 0.3, -size * 0.5], [side * size * 0.14, -size * 0.05], [side * size * -0.02, -size * 0.05]], side < 0 ? PALETTE.trafficBlue : PALETTE.trafficRed, PALETTE.ink, 2.5);
  }
  ellipse(ctx, 0, size * 0.12, size * 0.32, size * 0.32, PALETTE.star, PALETTE.ink, 3);
  ellipse(ctx, 0, size * 0.12, size * 0.23, size * 0.23, PALETTE.trophy, PALETTE.ink, 2);
  polygon(ctx, starPoints(0, size * 0.12, size * 0.15, size * 0.065), PALETTE.white, PALETTE.ink, 1.5);
  ctx.restore();
}

export function levelCardRobotButton(width, height) {
  const garage = levelCardGarageButton(width, height);
  const { cardX } = cardBox(width, height);
  const centerX = cardX + CARD_INSET + garage.radius;
  return { ...garage, x: centerX - garage.radius, centerX };
}

function drawRobotButton(ctx, width, height) {
  const button = levelCardRobotButton(width, height);
  ellipse(ctx, button.centerX, button.centerY + 4, button.radius, button.radius, PALETTE.ink, null);
  ellipse(ctx, button.centerX, button.centerY, button.radius, button.radius, PALETTE.robotLight, PALETTE.ink, 3);
  drawRobotCar(ctx, button.centerX, button.centerY, button.radius * 0.95, button.radius * 1.5, { time: 0 });
}

function drawGoButton(ctx, width, height) {
  const button = levelCardGoButton(width, height);
  ellipse(ctx, button.centerX, button.centerY + 5, button.radius, button.radius, PALETTE.ink, null);
  ellipse(ctx, button.centerX, button.centerY, button.radius, button.radius, PALETTE.button, PALETTE.ink, 4);
  ellipse(ctx, button.centerX, button.centerY, button.radius * 0.78, button.radius * 0.78, PALETTE.buttonLight, PALETTE.ink, 2);
  polygon(ctx, [
    [button.centerX - button.radius * 0.15, button.centerY - button.radius * 0.32],
    [button.centerX + button.radius * 0.34, button.centerY],
    [button.centerX - button.radius * 0.15, button.centerY + button.radius * 0.32]
  ], PALETTE.white, PALETTE.ink, 2.5);
}

const CARD_BOTTOM = 32;

function cardBox(width, height) {
  const cardWidth = Math.min(width - 36, 340);
  const room = height - SWITCH_BAND - CARD_BOTTOM;
  const cardHeight = Math.min(room, 550);
  return { cardWidth, cardHeight, cardX: (width - cardWidth) / 2, cardY: SWITCH_BAND + (room - cardHeight) / 2 };
}

export function levelCardBox(width, height) {
  const { cardWidth, cardHeight, cardX, cardY } = cardBox(width, height);
  return { x: cardX, y: cardY, width: cardWidth, height: cardHeight };
}

const CARD_INSET = 12;
const NUMBER_GAP = 10;

export function levelCardGarageButton(width, height) {
  const { cardWidth, cardX, cardY } = cardBox(width, height);
  const radius = clamp(cardWidth * 0.24, 64, 84) / 2;
  const centerX = cardX + cardWidth - CARD_INSET - radius;
  const centerY = cardY + CARD_INSET + radius;
  return { x: centerX - radius, y: centerY - radius, width: radius * 2, height: radius * 2, centerX, centerY, radius };
}

function drawLevelNumber(ctx, level, { width, height, y, size, robot, ink }) {
  const { cardX } = cardBox(width, height);
  const right = levelCardGarageButton(width, height).x - NUMBER_GAP;
  const robotButton = levelCardRobotButton(width, height);
  const left = robot ? robotButton.x + robotButton.width + NUMBER_GAP : cardX + NUMBER_GAP;
  const text = String(Math.max(1, Math.floor(level)));
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${size}px system-ui, sans-serif`;
  const measured = ctx.measureText(text).width;
  const centred = measured <= Math.min(right - width / 2, width / 2 - left) * 2;
  const room = right - left;
  if (!centred && measured > room) ctx.font = `900 ${Math.floor(size * room / measured)}px system-ui, sans-serif`;
  ctx.fillText(text, centred ? width / 2 : (left + right) / 2, y);
}

function iconPlace(width, height, numberBottom, cardWidth, wanted) {
  const goTop = levelCardGoButton(width, height).y - 4;
  const size = Math.max(0, Math.min(cardWidth * 0.34, 110, (goTop - numberBottom) / 1.6));
  return { size, y: Math.min(wanted, goTop - size * 1.08) };
}

function cardMarks(width, height) {
  const { cardWidth, cardHeight, cardX, cardY } = cardBox(width, height);
  const numberY = cardY + cardHeight * 0.18;
  const numberSize = clamp(cardWidth * 0.29, 72, 100);
  const icon = iconPlace(width, height, numberY + numberSize * 0.4, cardWidth, cardY + cardHeight * 0.44);
  return { cardWidth, cardHeight, cardX, cardY, numberY, numberSize, iconY: icon.y, iconSize: icon.size };
}

export function levelCardNoteBox(width, height) {
  const { cardWidth, cardX, iconY, iconSize } = cardMarks(width, height);
  const buttons = levelCardGarageButton(width, height);
  const top = Math.max(iconY - iconSize / 2, buttons.y + buttons.height + 4);
  return { x: cardX + CARD_INSET, y: top, width: cardWidth - 2 * CARD_INSET, height: Math.max(0, iconY + iconSize / 4 - top) };
}

export function drawLevelCard(ctx, options, { ground, hud } = DAY_THEME) {
  const { width, height, level = 1, result = 'start', time = 0, vehicle = {}, garageHint = false, rival = null, meReady = false, offerRobot = false } = options;
  ctx.save();
  ctx.fillStyle = ground.sky;
  ctx.fillRect(0, 0, width, height);
  ellipse(ctx, width * 0.08, height * 0.12, width * 0.16, width * 0.16, ground.sun, null);
  ellipse(ctx, width * 0.94, height * 0.72, width * 0.24, width * 0.24, ground.hill, null);
  const { cardWidth, cardHeight, cardX, cardY, numberY, numberSize, iconY, iconSize } = cardMarks(width, height);
  roundedRect(ctx, cardX, cardY + 6, cardWidth, cardHeight, 34);
  paint(ctx, PALETTE.ink, null);
  roundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 34);
  paint(ctx, hud.card, hud.edge, 5);
  if (result === 'won' || result === 'second') {
    ctx.save();
    roundedRect(ctx, cardX + 3, cardY + 3, cardWidth - 6, cardHeight - 6, 31);
    ctx.clip();
    drawConfetti(ctx, { width, height, time });
    ctx.restore();
  }
  drawLevelNumber(ctx, level, { width, height, y: numberY, size: numberSize, robot: offerRobot, ink: hud.text });
  if (result === 'won') drawTrophy(ctx, width / 2, iconY, iconSize);
  else if (result === 'second') drawMedal(ctx, width / 2, iconY, iconSize);
  else if (result === 'lost') drawRetryIcon(ctx, width / 2, iconY, iconSize);
  else if (rival?.status !== 'gone') drawStartIcon(ctx, width / 2, iconY, iconSize, hud.text);
  drawRacePair(ctx, width / 2, iconY + iconSize * 0.7, iconSize, { time, result, vehicle, rival, meReady });
  if (offerRobot) drawRobotButton(ctx, width, height);
  const garageButton = levelCardGarageButton(width, height);
  drawGarageButton(ctx, garageButton.centerX, garageButton.centerY, garageButton.radius * 2, {
    kind: vehicle.kind ?? 'car', color: vehicle.color ?? 'sunshine', time, wiggle: garageHint,
  });
  drawGoButton(ctx, width, height);
  ctx.restore();
}

function drawPhone(ctx, x, y, width, height, color) {
  roundedRect(ctx, x - width / 2, y - height / 2, width, height, Math.min(width, height) * 0.12);
  paint(ctx, color, PALETTE.white, 4);
  roundedRect(ctx, x - width * 0.35, y - height * 0.38, width * 0.7, height * 0.76, 6);
  paint(ctx, PALETTE.playerGlass, null);
}

export function drawRotateHint(ctx, { width, height }) {
  ctx.save();
  ctx.fillStyle = PALETTE.cityDark;
  ctx.fillRect(0, 0, width, height);
  const unit = Math.min(width, height);
  const y = height * 0.55;
  ctx.globalAlpha = 0.45;
  drawPhone(ctx, width * 0.3, y, unit * 0.4, unit * 0.24, PALETTE.building);
  ctx.globalAlpha = 1;
  drawPhone(ctx, width * 0.7, y, unit * 0.24, unit * 0.4, PALETTE.robot);
  ctx.beginPath();
  ctx.arc(width * 0.5, height * 0.44, unit * 0.24, Math.PI * 1.08, Math.PI * 1.85);
  ctx.strokeStyle = PALETTE.player;
  ctx.lineWidth = unit * 0.025;
  ctx.lineCap = 'round';
  ctx.stroke();
  const tipX = width * 0.5 + Math.cos(Math.PI * 1.85) * unit * 0.24;
  const tipY = height * 0.44 + Math.sin(Math.PI * 1.85) * unit * 0.24;
  polygon(ctx, [[tipX, tipY], [tipX - unit * 0.09, tipY - unit * 0.015], [tipX - unit * 0.025, tipY + unit * 0.075]], PALETTE.player, null);
  ctx.restore();
}
