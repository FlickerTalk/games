import { PALETTE } from './art-palette.js';
import { clamp, ellipse, hash, paint, polygon, roundedRect } from './art-shapes.js';

function sceneryColor(scenery) {
  return {
    meadow: PALETTE.meadow,
    desert: PALETTE.desert,
    snow: PALETTE.snow,
    night: PALETTE.city
  }[scenery] || PALETTE.meadow;
}

function drawRoundTree(ctx, x, y, size, snowy, seed) {
  ctx.save();
  ctx.translate(x, y);
  roundedRect(ctx, -size * 0.07, size * 0.12, size * 0.14, size * 0.35, size * 0.04);
  paint(ctx, PALETTE.trunk, PALETTE.ink, 2);
  ellipse(ctx, 0, -size * 0.08, size * 0.36, size * 0.38, snowy ? PALETTE.pine : PALETTE.tree, PALETTE.ink, 2.5);
  ellipse(ctx, -size * 0.2, size * 0.03, size * 0.22, size * 0.24, snowy ? PALETTE.pineLight : PALETTE.treeLight, PALETTE.ink, 2);
  ellipse(ctx, size * 0.19, size * 0.01, size * 0.22, size * 0.25, snowy ? PALETTE.pine : PALETTE.treeLight, PALETTE.ink, 2);
  if (snowy) {
    ctx.beginPath();
    ctx.arc(-size * 0.04, -size * 0.18, size * 0.25, Math.PI * 1.08, Math.PI * 1.9);
    ctx.strokeStyle = PALETTE.snow;
    ctx.lineWidth = size * 0.1;
    ctx.lineCap = 'round';
    ctx.stroke();
  } else if (hash(seed) > 0.55) {
    for (const side of [-1, 1]) {
      ellipse(ctx, side * size * 0.14, -size * 0.05, size * 0.045, size * 0.045, PALETTE.trafficRed, null);
    }
  }
  ctx.restore();
}

function drawPine(ctx, x, y, size, snowy) {
  ctx.save();
  ctx.translate(x, y);
  roundedRect(ctx, -size * 0.06, size * 0.19, size * 0.12, size * 0.27, size * 0.03);
  paint(ctx, PALETTE.trunk, PALETTE.ink, 2);
  for (let layer = 0; layer < 3; layer += 1) {
    const top = -size * 0.48 + layer * size * 0.2;
    const half = size * (0.2 + layer * 0.09);
    polygon(ctx, [[0, top], [half, top + size * 0.38], [-half, top + size * 0.38]], layer % 2 ? PALETTE.pineLight : PALETTE.pine, PALETTE.ink, 2);
    if (snowy) {
      ctx.beginPath();
      ctx.moveTo(-half * 0.65, top + size * 0.25);
      ctx.quadraticCurveTo(0, top + size * 0.34, half * 0.65, top + size * 0.25);
      ctx.strokeStyle = PALETTE.snow;
      ctx.lineWidth = size * 0.07;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawFlowers(ctx, x, y, size, seed) {
  for (let index = 0; index < 5; index += 1) {
    const px = x + (hash(seed + index) - 0.5) * size;
    const py = y + (hash(seed + index + 8) - 0.5) * size * 0.6;
    ctx.beginPath();
    ctx.moveTo(px, py + size * 0.12);
    ctx.lineTo(px, py);
    ctx.strokeStyle = PALETTE.meadowDark;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ellipse(ctx, px, py, size * 0.065, size * 0.065, index % 2 ? PALETTE.player : PALETTE.white, PALETTE.meadowDark, 1.2);
  }
}

function drawFence(ctx, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  for (const py of [-size * 0.08, size * 0.12]) {
    roundedRect(ctx, -size * 0.48, py, size * 0.96, size * 0.09, size * 0.025);
    paint(ctx, PALETTE.trafficCream, PALETTE.ink, 1.8);
  }
  for (const px of [-size * 0.34, 0, size * 0.34]) {
    roundedRect(ctx, px - size * 0.055, -size * 0.25, size * 0.11, size * 0.56, size * 0.025);
    paint(ctx, PALETTE.trunk, PALETTE.ink, 1.8);
  }
  ctx.restore();
}

function drawCactus(ctx, x, y, size, seed) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const flip = hash(seed) > 0.5 ? 1 : -1;
  const paths = [
    [[0, size * 0.34], [0, -size * 0.34]],
    [[0, -size * 0.02], [-size * 0.22 * flip, -size * 0.02], [-size * 0.22 * flip, -size * 0.2]],
    [[0, size * 0.12], [size * 0.22 * flip, size * 0.12], [size * 0.22 * flip, -size * 0.08]]
  ];
  for (const points of paths) {
    ctx.beginPath();
    points.forEach(([px, py], index) => index ? ctx.lineTo(px, py) : ctx.moveTo(px, py));
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = size * 0.2;
    ctx.stroke();
    ctx.strokeStyle = PALETTE.cactus;
    ctx.lineWidth = size * 0.12;
    ctx.stroke();
  }
  ctx.restore();
}

function drawDune(ctx, x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x - size * 0.55, y + size * 0.2);
  ctx.quadraticCurveTo(x - size * 0.12, y - size * 0.35, x + size * 0.55, y + size * 0.2);
  ctx.closePath();
  paint(ctx, PALETTE.desertDark, null);
  ctx.beginPath();
  ctx.moveTo(x - size * 0.12, y - size * 0.12);
  ctx.quadraticCurveTo(x + size * 0.08, y - size * 0.2, x + size * 0.28, y + size * 0.02);
  ctx.strokeStyle = PALETTE.desert;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawRocks(ctx, x, y, size, snowy) {
  ellipse(ctx, x - size * 0.12, y + size * 0.06, size * 0.24, size * 0.17, snowy ? PALETTE.snowShadow : PALETTE.rock, PALETTE.ink, 2);
  ellipse(ctx, x + size * 0.18, y + size * 0.12, size * 0.15, size * 0.11, snowy ? PALETTE.snow : PALETTE.desertDark, PALETTE.ink, 2);
}

function drawSnowman(ctx, x, y, size) {
  ellipse(ctx, x, y + size * 0.18, size * 0.25, size * 0.25, PALETTE.white, PALETTE.ink, 2);
  ellipse(ctx, x, y - size * 0.16, size * 0.19, size * 0.19, PALETTE.white, PALETTE.ink, 2);
  for (const side of [-1, 1]) {
    ellipse(ctx, x + side * size * 0.07, y - size * 0.2, size * 0.025, size * 0.025, PALETTE.ink, null);
  }
  polygon(ctx, [[x, y - size * 0.13], [x + size * 0.16, y - size * 0.09], [x, y - size * 0.07]], PALETTE.cone, null);
  roundedRect(ctx, x - size * 0.19, y - size * 0.01, size * 0.38, size * 0.08, size * 0.03);
  paint(ctx, PALETTE.trafficRed, null);
  ellipse(ctx, x, y + size * 0.14, size * 0.025, size * 0.025, PALETTE.ink, null);
}

function drawBuilding(ctx, x, y, size, seed) {
  const width = size * (0.82 + hash(seed) * 0.25);
  const height = size * (1.05 + hash(seed + 2) * 0.45);
  roundedRect(ctx, x - width / 2, y - height / 2, width, height, size * 0.06);
  paint(ctx, Math.abs(seed) % 2 > 1 ? PALETTE.buildingAlt : PALETTE.building, PALETTE.cityDark, 3);
  roundedRect(ctx, x - width * 0.38, y - height * 0.44, width * 0.76, height * 0.09, 2);
  paint(ctx, PALETTE.windowDark, null);
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 2; column += 1) {
      const lit = hash(seed + row * 3 + column) > 0.35;
      roundedRect(ctx, x - width * 0.29 + column * width * 0.34, y - height * 0.22 + row * height * 0.23, width * 0.23, height * 0.12, 2);
      paint(ctx, lit ? PALETTE.window : PALETTE.windowDark, null);
    }
  }
}

function drawStreetLamp(ctx, x, y, size) {
  ctx.save();
  ctx.globalAlpha = 0.2;
  ellipse(ctx, x, y + size * 0.42, size * 0.5, size * 0.2, PALETTE.lampLight, null);
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.4);
  ctx.lineTo(x, y - size * 0.32);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = size * 0.09;
  ctx.lineCap = 'round';
  ctx.stroke();
  roundedRect(ctx, x - size * 0.18, y - size * 0.45, size * 0.36, size * 0.19, size * 0.06);
  paint(ctx, PALETTE.lampLight, PALETTE.ink, 2);
  roundedRect(ctx, x - size * 0.12, y - size * 0.4, size * 0.24, size * 0.07, size * 0.02);
  paint(ctx, PALETTE.white, null);
  ctx.restore();
}

function drawRoadsideItem(ctx, scenery, x, y, size, seed) {
  const variant = hash(seed);
  if (scenery === 'desert') {
    if (variant < 0.22) drawRocks(ctx, x, y, size, false);
    else if (variant < 0.43) drawDune(ctx, x, y, size);
    else drawCactus(ctx, x, y, size * 0.85, seed);
  } else if (scenery === 'snow') {
    if (variant < 0.16) drawSnowman(ctx, x, y, size);
    else if (variant < 0.28) drawRocks(ctx, x, y, size, true);
    else if (variant < 0.72) drawPine(ctx, x, y, size, true);
    else drawRoundTree(ctx, x, y, size, true, seed);
  } else if (scenery === 'night') {
    if (variant < 0.58) drawBuilding(ctx, x, y, size, seed);
    else drawStreetLamp(ctx, x, y, size);
  } else if (variant < 0.16) {
    drawFlowers(ctx, x, y, size, seed);
  } else if (variant < 0.3) {
    drawFence(ctx, x, y, size);
  } else if (variant < 0.63) {
    drawPine(ctx, x, y, size, false);
  } else {
    drawRoundTree(ctx, x, y, size, false, seed);
  }
}

export function drawRoadside(ctx, { width, height, roadLeft, roadWidth, scroll = 0, scenery = 'meadow' }) {
  ctx.save();
  ctx.fillStyle = sceneryColor(scenery);
  ctx.fillRect(0, 0, width, height);
  const rightLeft = roadLeft + roadWidth;
  const sideSpace = Math.min(roadLeft, width - rightLeft);
  const scale = clamp(sideSpace / 58, 0.55, 1.15);
  const spacing = 94 * scale;
  const start = Math.floor(-scroll / spacing) - 1;
  const rows = Math.ceil(height / spacing) + 3;
  for (let row = start; row < start + rows; row += 1) {
    const y = row * spacing + scroll;
    const size = 52 * scale * (0.82 + hash(row * 4.1) * 0.3);
    const leftX = roadLeft * (0.42 + hash(row * 3.7) * 0.16);
    const rightX = rightLeft + (width - rightLeft) * (0.42 + hash(row * 5.3) * 0.16);
    drawRoadsideItem(ctx, scenery, leftX, y, size, row * 2.17);
    drawRoadsideItem(ctx, scenery, rightX, y + spacing * 0.35, size, row * 2.17 + 19);
  }
  ctx.restore();
}
