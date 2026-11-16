import { clamp, ellipse, line, paint, polygon, roundedRect, starPath } from "../../../kit/src/canvas/pen.js";
import { drawPaintBall } from "./effects.js";

export const TARGET_KINDS = Object.freeze([
  "blocks", "cans", "vane", "bell", "windmill", "balloon", "pinata", "kite",
  "barrels", "buoy", "chestRaft", "bottles", "lighthouse", "iceberg", "pirateFlag", "rubberRing",
  "sunkenChest", "clam", "bubbles", "anchor", "giftCrate", "rainCloud", "trampoline",
]);

export function drawStar(ctx, x, y, size, fill, art, turn = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(turn);
  starPath(ctx, 0, 0, size / 2, size * 0.24);
  paint(ctx, fill, art.ink, Math.max(2, size * 0.055));
  ctx.restore();
}

export function drawGift(ctx, x, y, size, art, time = 0) {
  ctx.save();
  ctx.translate(x, y + Math.sin(time * 2.5) * size * 0.025);
  roundedRect(ctx, -size * 0.38, -size * 0.23, size * 0.76, size * 0.58, size * 0.08);
  paint(ctx, art.rival, art.ink, size * 0.045);
  roundedRect(ctx, -size * 0.44, -size * 0.34, size * 0.88, size * 0.2, size * 0.06);
  paint(ctx, art.rivalLight, art.ink, size * 0.045);
  roundedRect(ctx, -size * 0.07, -size * 0.34, size * 0.14, size * 0.69, size * 0.02);
  paint(ctx, art.player, art.ink, size * 0.025);
  for (const side of [-1, 1]) ellipse(ctx, side * size * 0.13, -size * 0.43, size * 0.15, size * 0.1, art.coral, art.ink, size * 0.035);
  ctx.restore();
}

function rewardStars(ctx, s, hit, art) {
  if (hit <= 0) return;
  for (let star = 0; star < 3; star += 1) {
    const travel = clamp(hit * 1.4 - star * 0.12);
    drawStar(ctx, (star - 1) * s * 0.25, -s * (0.3 + travel * 0.55), s * 0.18 * Math.sin(travel * Math.PI), art.star, art, star * 0.2);
  }
}

function blocks(ctx, s, hit, art) {
  const colours = [art.coral, art.player, art.azure];
  for (let block = 0; block < 3; block += 1) {
    const way = block === 1 ? -1 : 1;
    ctx.save();
    ctx.translate((block - 1) * s * 0.24 + way * hit * s * 0.13, s * (0.27 - block * 0.25) + hit * hit * s * block * 0.13);
    ctx.rotate(way * hit * (0.35 + block * 0.3));
    roundedRect(ctx, -s * 0.16, -s * 0.16, s * 0.32, s * 0.32, s * 0.04);
    paint(ctx, colours[block], art.ink, s * 0.025);
    drawStar(ctx, 0, 0, s * 0.15, art.white, art);
    ctx.restore();
  }
}

function cans(ctx, s, hit, art) {
  line(ctx, [[-s * 0.5, s * 0.35], [s * 0.5, s * 0.35]], art.trunk, s * 0.07);
  for (let can = 0; can < 4; can += 1) {
    const jump = Math.sin(clamp(hit * 1.5 - can * 0.1) * Math.PI);
    ctx.save();
    ctx.translate((can - 1.5) * s * 0.24, s * 0.12 - jump * s * 0.34);
    ctx.rotate((can - 1.5) * hit * 0.25);
    roundedRect(ctx, -s * 0.085, -s * 0.2, s * 0.17, s * 0.34, s * 0.04);
    paint(ctx, can % 2 ? art.tin : art.coral, art.ink, s * 0.025);
    line(ctx, [[-s * 0.06, -s * 0.1], [s * 0.06, -s * 0.1]], art.white, s * 0.025);
    ctx.restore();
  }
}

function vane(ctx, s, hit, art, time) {
  line(ctx, [[0, s * 0.45], [0, -s * 0.28]], art.ink, s * 0.045);
  ellipse(ctx, 0, s * 0.44, s * 0.22, s * 0.06, art.rock, art.ink, s * 0.025);
  ctx.save();
  ctx.translate(0, -s * 0.26);
  ctx.rotate(hit > 0 ? time * 8 + hit : Math.sin(time) * 0.12);
  line(ctx, [[-s * 0.42, 0], [s * 0.42, 0]], art.ink, s * 0.045);
  polygon(ctx, [[s * 0.44, 0], [s * 0.25, -s * 0.13], [s * 0.25, s * 0.13]], art.player, art.ink, s * 0.02);
  polygon(ctx, [[-s * 0.42, 0], [-s * 0.27, -s * 0.16], [-s * 0.27, s * 0.16]], art.coral, art.ink, s * 0.02);
  ctx.restore();
  ellipse(ctx, 0, -s * 0.26, s * 0.07, s * 0.07, art.hub, art.ink, s * 0.02);
}

function bellShape(ctx, x, y, s, colour, art) {
  ctx.beginPath();
  ctx.moveTo(x - s * 0.3, y + s * 0.2);
  ctx.quadraticCurveTo(x - s * 0.18, y, x - s * 0.14, y - s * 0.23);
  ctx.quadraticCurveTo(x, y - s * 0.42, x + s * 0.14, y - s * 0.23);
  ctx.quadraticCurveTo(x + s * 0.18, y, x + s * 0.3, y + s * 0.2);
  ctx.closePath();
  paint(ctx, colour, art.ink, s * 0.035);
  ellipse(ctx, x, y + s * 0.23, s * 0.08, s * 0.08, art.coralDark, art.ink, s * 0.02);
}

function bell(ctx, s, hit, art, time) {
  line(ctx, [[-s * 0.32, s * 0.45], [-s * 0.32, -s * 0.4], [s * 0.25, -s * 0.4]], art.trunk, s * 0.07);
  ctx.save();
  ctx.translate(s * 0.12, -s * 0.34);
  ctx.rotate(Math.sin(time * 12) * hit * 0.35);
  bellShape(ctx, 0, s * 0.18, s * 0.75, hit > 0 ? art.star : art.gold, art);
  ctx.restore();
}

function windmill(ctx, s, hit, art, time, colour) {
  polygon(ctx, [[-s * 0.17, s * 0.45], [-s * 0.1, -s * 0.12], [s * 0.1, -s * 0.12], [s * 0.17, s * 0.45]], art.cream, art.ink, s * 0.03);
  ctx.save();
  ctx.translate(0, -s * 0.15);
  ctx.rotate(time * (hit > 0 ? 5 : 0.7));
  for (let blade = 0; blade < 4; blade += 1) {
    ctx.rotate(Math.PI / 2);
    polygon(ctx, [[0, 0], [s * 0.08, -s * 0.42], [s * 0.22, -s * 0.35], [s * 0.1, 0]], hit > 0 && blade % 2 === 0 ? colour : art.woodLight, art.ink, s * 0.02);
  }
  ctx.restore();
  ellipse(ctx, 0, -s * 0.15, s * 0.07, s * 0.07, art.coral, art.ink, s * 0.02);
}

function balloon(ctx, s, hit, art, time) {
  ctx.save();
  ctx.translate(Math.sin(time * 0.8) * s * 0.08, hit * s * 0.1);
  ctx.rotate(Math.sin(time * 5) * hit * 0.12);
  ellipse(ctx, 0, -s * 0.1, s * 0.34, s * 0.4, art.parachute, art.ink, s * 0.03);
  polygon(ctx, [[-s * 0.22, -s * 0.37], [-s * 0.08, -s * 0.46], [s * 0.04, s * 0.27], [-s * 0.1, s * 0.29]], art.player);
  ellipse(ctx, 0, -s * 0.1, s * 0.19, s * 0.23, null, art.white, s * 0.035);
  ellipse(ctx, 0, -s * 0.1, s * 0.07, s * 0.09, art.coral);
  line(ctx, [[-s * 0.16, s * 0.23], [-s * 0.1, s * 0.43], [s * 0.1, s * 0.43], [s * 0.16, s * 0.23]], art.ink, s * 0.018);
  roundedRect(ctx, -s * 0.13, s * 0.36, s * 0.26, s * 0.15, s * 0.03);
  paint(ctx, art.wood, art.ink, s * 0.02);
  ctx.restore();
  rewardStars(ctx, s, hit, art);
}

function pinata(ctx, s, hit, art, time) {
  line(ctx, [[0, -s * 0.5], [0, -s * 0.32]], art.ink, s * 0.025);
  ctx.save();
  ctx.rotate(Math.sin(time * 7) * hit * 0.18);
  roundedRect(ctx, -s * 0.34, -s * 0.3, s * 0.68, s * 0.52, s * 0.16);
  paint(ctx, hit > 0.6 ? art.playerLight : art.rivalLight, art.ink, s * 0.03);
  [art.coral, art.player, art.azure].forEach((colour, stripe) => line(ctx, [[-s * 0.28, -s * (0.18 - stripe * 0.16)], [s * 0.28, -s * (0.18 - stripe * 0.16)]], colour, s * 0.09));
  for (const side of [-1, 1]) polygon(ctx, [[side * s * 0.27, s * 0.15], [side * s * 0.38, s * 0.4], [side * s * 0.12, s * 0.18]], art.coral, art.ink, s * 0.02);
  ctx.restore();
  rewardStars(ctx, s, hit, art);
}

function kite(ctx, s, hit, art, time) {
  ctx.save();
  ctx.translate(0, hit * s * 0.12);
  ctx.rotate(Math.sin(time * 4) * (0.08 + hit * 0.25));
  polygon(ctx, [[0, -s * 0.45], [s * 0.32, -s * 0.08], [0, s * 0.28], [-s * 0.32, -s * 0.08]], art.player, art.ink, s * 0.03);
  polygon(ctx, [[0, -s * 0.45], [s * 0.32, -s * 0.08], [0, -s * 0.08]], art.coral);
  line(ctx, [[0, -s * 0.42], [0, s * 0.26], [s * 0.3, -s * 0.08], [-s * 0.3, -s * 0.08]], art.ink, s * 0.018);
  line(ctx, [[0, s * 0.27], [s * 0.12, s * 0.42], [-s * 0.03, s * 0.52]], art.ink, s * 0.02);
  ctx.restore();
}

function barrels(ctx, s, hit, art, time) {
  for (let barrel = 0; barrel < 2; barrel += 1) {
    ctx.save();
    ctx.translate((barrel - 0.5) * s * 0.45, Math.sin(time * 2 + barrel) * s * 0.04);
    ctx.rotate((barrel ? 1 : -1) * hit * 0.55);
    roundedRect(ctx, -s * 0.18, -s * 0.3, s * 0.36, s * 0.55, s * 0.09);
    paint(ctx, art.wood, art.ink, s * 0.03);
    for (const band of [-1, 1]) line(ctx, [[-s * 0.16, band * s * 0.16], [s * 0.16, band * s * 0.16]], art.hub, s * 0.045);
    ctx.restore();
  }
}

function buoy(ctx, s, hit, art, time) {
  ellipse(ctx, 0, s * 0.25, s * 0.35, s * 0.12, art.coral, art.ink, s * 0.03);
  polygon(ctx, [[-s * 0.18, s * 0.22], [-s * 0.08, -s * 0.12], [s * 0.08, -s * 0.12], [s * 0.18, s * 0.22]], art.white, art.ink, s * 0.025);
  line(ctx, [[0, -s * 0.1], [0, -s * 0.4]], art.ink, s * 0.04);
  ctx.save();
  ctx.translate(0, -s * 0.35);
  ctx.rotate(Math.sin(time * 10) * hit * 0.3);
  bellShape(ctx, 0, 0, s * 0.4, hit > 0 ? art.star : art.gold, art);
  ctx.restore();
}

function chest(ctx, s, hit, art, raft) {
  if (raft) {
    for (let log = -1; log <= 1; log += 1) {
      roundedRect(ctx, log * s * 0.25 - s * 0.13, s * 0.23, s * 0.26, s * 0.17, s * 0.07);
      paint(ctx, art.wood, art.ink, s * 0.02);
    }
  }
  roundedRect(ctx, -s * 0.34, -s * 0.03, s * 0.68, s * 0.35, s * 0.06);
  paint(ctx, art.wood, art.ink, s * 0.03);
  ctx.save();
  ctx.translate(0, -s * 0.03);
  ctx.rotate(-hit * 0.65);
  roundedRect(ctx, -s * 0.35, -s * 0.23, s * 0.7, s * 0.23, s * 0.1);
  paint(ctx, art.woodLight, art.ink, s * 0.03);
  ctx.restore();
  roundedRect(ctx, -s * 0.06, s * 0.02, s * 0.12, s * 0.17, s * 0.02);
  paint(ctx, art.gold, art.ink, s * 0.018);
  rewardStars(ctx, s, hit, art);
}

function bottles(ctx, s, hit, art, time) {
  for (let bottle = 0; bottle < 4; bottle += 1) {
    const jump = Math.sin(clamp(hit * 1.4 - bottle * 0.08) * Math.PI);
    ctx.save();
    ctx.translate((bottle - 1.5) * s * 0.23, Math.sin(time * 2 + bottle) * s * 0.035 - jump * s * 0.25);
    ctx.rotate((bottle - 1.5) * 0.08 + jump * 0.3);
    roundedRect(ctx, -s * 0.07, -s * 0.18, s * 0.14, s * 0.36, s * 0.05);
    paint(ctx, art.glass, art.ink, s * 0.02);
    roundedRect(ctx, -s * 0.035, -s * 0.31, s * 0.07, s * 0.16, s * 0.02);
    paint(ctx, art.glass, art.ink, s * 0.018);
    ctx.restore();
  }
}

function lighthouse(ctx, s, hit, art, time, colour) {
  polygon(ctx, [[-s * 0.22, s * 0.46], [-s * 0.13, -s * 0.2], [s * 0.13, -s * 0.2], [s * 0.22, s * 0.46]], art.white, art.ink, s * 0.03);
  polygon(ctx, [[-s * 0.16, s * 0.13], [s * 0.16, s * 0.13], [s * 0.14, s * 0.27], [-s * 0.18, s * 0.27]], art.coral);
  roundedRect(ctx, -s * 0.22, -s * 0.38, s * 0.44, s * 0.21, s * 0.04);
  paint(ctx, art.glass, art.ink, s * 0.025);
  polygon(ctx, [[-s * 0.27, -s * 0.38], [0, -s * 0.54], [s * 0.27, -s * 0.38]], art.coral, art.ink, s * 0.025);
  if (hit <= 0) return;
  ctx.save();
  ctx.globalAlpha *= 0.45 + Math.sin(time * 5) * 0.15;
  ellipse(ctx, 0, -s * 0.28, s * 0.28, s * 0.2, colour);
  ctx.restore();
  for (const side of [-1, 1]) line(ctx, [[side * s * 0.25, -s * 0.28], [side * s * 0.48, -s * 0.28]], colour, s * 0.04);
}

function iceberg(ctx, s, hit, art) {
  [[-0.25, 0.08, -1], [0.02, -0.08, 1], [0.29, 0.1, 1]].forEach(([x, y, way], piece) => {
    ctx.save();
    ctx.translate(x * s + way * hit * s * 0.08, y * s + hit * s * piece * 0.08);
    ctx.rotate(way * hit * 0.14);
    polygon(ctx, [[-s * 0.23, s * 0.24], [-s * 0.16, -s * 0.12], [0, -s * 0.31], [s * 0.2, s * 0.24]], piece === 1 ? art.ice : art.snow, art.ink, s * 0.025);
    if (hit > 0) line(ctx, [[0, -s * 0.2], [-s * 0.05, 0], [s * 0.04, s * 0.14]], art.iceDark, s * 0.025);
    ctx.restore();
  });
}

function pirateFlag(ctx, s, hit, art, time, colour) {
  line(ctx, [[-s * 0.15, s * 0.45], [-s * 0.15, -s * 0.47]], art.trunk, s * 0.055);
  ellipse(ctx, -s * 0.05, s * 0.4, s * 0.39, s * 0.13, art.rock, art.ink, s * 0.025);
  const wave = Math.sin(time * (hit > 0 ? 9 : 4)) * s * 0.04;
  polygon(ctx, [[-s * 0.12, -s * 0.43], [s * 0.39, -s * 0.34 + wave], [s * 0.3, s * 0.02 + wave], [-s * 0.12, -s * 0.06]], hit > 0 ? colour : art.rival, art.ink, s * 0.025);
  drawStar(ctx, s * 0.1, -s * 0.2 + wave * 0.4, s * 0.22, art.white, art);
}

function rubberRing(ctx, s, hit, art, time) {
  ctx.save();
  ctx.translate(0, Math.sin(time * 2) * s * 0.035);
  ctx.rotate(hit * Math.sin(time * 8 + 1) * 0.3 + hit * 0.2);
  ctx.scale(1 + hit * 0.15, 1 - hit * 0.12);
  ellipse(ctx, 0, 0, s * 0.43, s * 0.27, art.coral, art.ink, s * 0.035);
  ellipse(ctx, 0, 0, s * 0.22, s * 0.12, art.spray, art.ink, s * 0.025);
  for (let stripe = 0; stripe < 4; stripe += 1) {
    const turn = (stripe * Math.PI) / 2;
    line(ctx, [[Math.cos(turn) * s * 0.31, Math.sin(turn) * s * 0.19], [Math.cos(turn) * s * 0.4, Math.sin(turn) * s * 0.25]], art.white, s * 0.07);
  }
  ctx.restore();
}

function clam(ctx, s, hit, art) {
  ellipse(ctx, 0, s * 0.18, s * 0.42, s * 0.23, art.rivalLight, art.ink, s * 0.03);
  ctx.save();
  ctx.translate(0, s * 0.05);
  ctx.rotate(-hit * 0.65);
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.4, Math.PI, Math.PI * 2);
  ctx.lineTo(s * 0.4, 0);
  ctx.closePath();
  paint(ctx, art.roseLight, art.ink, s * 0.03);
  for (let rib = -2; rib <= 2; rib += 1) line(ctx, [[0, 0], [rib * s * 0.14, -s * (0.32 - Math.abs(rib) * 0.035)]], art.rival, s * 0.018);
  ctx.restore();
  if (hit > 0.15) ellipse(ctx, 0, s * 0.04, s * 0.13, s * 0.13, art.pearl, art.ink, s * 0.02);
}

function bubbleCluster(ctx, s, hit, art, time) {
  for (let bubble = 0; bubble < 7; bubble += 1) {
    const local = clamp(hit * 2 - bubble * 0.12);
    if (local >= 0.95) continue;
    const r = s * (0.1 + (bubble % 3) * 0.025) * (1 + local * 0.35);
    ctx.save();
    ctx.globalAlpha *= 1 - local;
    ellipse(ctx, Math.cos(bubble * 2.4) * s * 0.28, Math.sin(bubble * 2.4) * s * 0.3 - local * s * 0.12 + Math.sin(time * 2 + bubble) * s * 0.02, r, r, art.bubble, art.foam, s * 0.018);
    ctx.restore();
  }
}

function anchor(ctx, s, hit, art, time) {
  ctx.save();
  ctx.rotate(Math.sin(time * 6 + 0.5) * hit * 0.35 + hit * 0.1);
  ellipse(ctx, 0, -s * 0.38, s * 0.1, s * 0.1, null, art.ink, s * 0.045);
  line(ctx, [[0, -s * 0.27], [0, s * 0.29]], art.ink, s * 0.1);
  line(ctx, [[0, -s * 0.27], [0, s * 0.29]], art.hub, s * 0.055);
  line(ctx, [[-s * 0.22, -s * 0.13], [s * 0.22, -s * 0.13]], art.ink, s * 0.08);
  ctx.beginPath();
  ctx.arc(0, s * 0.05, s * 0.34, 0.15, Math.PI - 0.15);
  ctx.strokeStyle = art.ink;
  ctx.lineWidth = s * 0.09;
  ctx.stroke();
  for (const side of [-1, 1]) polygon(ctx, [[side * s * 0.33, s * 0.1], [side * s * 0.43, s * 0.29], [side * s * 0.22, s * 0.25]], art.hub, art.ink, s * 0.02);
  ctx.restore();
}

function giftCrate(ctx, s, hit, art, time) {
  ctx.save();
  ctx.translate(Math.sin(time) * s * 0.04, hit * s * 0.1);
  ctx.beginPath();
  ctx.arc(0, -s * 0.16, s * 0.43, Math.PI, Math.PI * 2);
  ctx.closePath();
  paint(ctx, art.parachute, art.ink, s * 0.03);
  polygon(ctx, [[-s * 0.15, -s * 0.57], [0, -s * 0.6], [s * 0.13, -s * 0.16], [-s * 0.03, -s * 0.16]], art.player);
  line(ctx, [[-s * 0.4, -s * 0.16], [-s * 0.22, s * 0.19], [s * 0.22, s * 0.19], [s * 0.4, -s * 0.16]], art.ink, s * 0.018);
  if (hit < 0.65) drawGift(ctx, 0, s * 0.27, s * 0.55, art, time);
  else drawPaintBall(ctx, 0, s * 0.12, s * 0.15, "rainbow", art.player, art, time);
  ctx.restore();
  rewardStars(ctx, s, hit, art);
}

function rainCloud(ctx, s, hit, art, time) {
  ellipse(ctx, -s * 0.22, -s * 0.14, s * 0.25, s * 0.2, art.white, art.ink, s * 0.025);
  ellipse(ctx, s * 0.04, -s * 0.24, s * 0.3, s * 0.27, art.white, art.ink, s * 0.025);
  ellipse(ctx, s * 0.28, -s * 0.12, s * 0.22, s * 0.18, art.white, art.ink, s * 0.025);
  roundedRect(ctx, -s * 0.43, -s * 0.18, s * 0.85, s * 0.25, s * 0.1);
  paint(ctx, art.white, art.ink, s * 0.025);
  if (hit <= 0) return;
  for (let drop = 0; drop < 6; drop += 1) {
    const fall = (time * 1.3 + drop / 6) % 1;
    line(ctx, [[(drop - 2.5) * s * 0.14, s * (0.12 + fall * 0.45)], [(drop - 2.5) * s * 0.14 - s * 0.025, s * (0.2 + fall * 0.45)]], art.sea, s * 0.025);
  }
}

function trampoline(ctx, s, hit, art, time) {
  const squash = Math.sin(hit * Math.PI);
  for (const side of [-1, 1]) line(ctx, [[side * s * 0.3, s * 0.12], [side * s * 0.4, s * 0.43]], art.ink, s * 0.055);
  ctx.save();
  ctx.scale(1 + squash * 0.12, 1 - squash * 0.3);
  ellipse(ctx, 0, s * 0.08, s * 0.43, s * 0.15, art.azure, art.ink, s * 0.035);
  ellipse(ctx, 0, s * 0.08, s * 0.32, s * 0.09, art.glass, art.ink, s * 0.02);
  ctx.restore();
  if (hit > 0) drawPaintBall(ctx, 0, -s * (0.12 + squash * 0.55), s * 0.11, "bouncy", art.player, art, time);
}

const DRAW = {
  blocks, cans, vane, bell, windmill, balloon, pinata, kite, barrels, buoy, bottles, lighthouse, iceberg, pirateFlag, rubberRing, clam, anchor, giftCrate, rainCloud, trampoline,
  chestRaft: (ctx, s, hit, art) => chest(ctx, s, hit, art, true),
  sunkenChest: (ctx, s, hit, art) => chest(ctx, s, hit, art, false),
  bubbles: bubbleCluster,
};

export function drawTarget(ctx, x, y, size, kind, art, { hit = 0, time = 0, colour = art.player } = {}) {
  const draw = DRAW[kind];
  ctx.save();
  ctx.translate(x, y);
  if (draw) draw(ctx, size, clamp(hit), art, time, colour);
  ctx.restore();
}
