import { ellipse, line, paint, polygon, roundedRect, starPath } from "../../../kit/src/canvas/pen.js";
import { drawParachute, drawTailBalloons } from "./balloons.js";
import { familyOf } from "./levels.js";
import { rimmed } from "./rim.js";

export const POSES = Object.freeze(["idle", "bankLeft", "bankRight", "speed", "hit", "losing", "hover"]);
// how far ahead of its middle the pilot sits, in the aircraft's box of 120
export const COCKPIT = Object.freeze({ propeller: 13, biplane: 13, jet: 14, seaplane: 13, stunt: 13, paper: 6, bubble: 16, tandem: 25, rescue: 16, saucer: 8 });

const BOX = 120;
const PILOT = 0.3;

function propeller(ctx, art, time, y = -43, long = 30) {
  ctx.save();
  ctx.translate(0, y);
  ctx.rotate(time * 18);
  line(ctx, [[-long, 0], [long, 0]], art.craft.blade, 6);
  line(ctx, [[0, -long * 0.45], [0, long * 0.45]], art.craft.blade, 5);
  ctx.restore();
  ellipse(ctx, 0, y, 5, 5, art.craft.hub, art.ink, 2);
}

function body(ctx, art, colour, long = false) {
  const nose = long ? -51 : -46;
  ctx.beginPath();
  ctx.moveTo(0, nose);
  ctx.bezierCurveTo(-13, -36, -12, 12, -8, 39);
  ctx.quadraticCurveTo(0, 47, 8, 39);
  ctx.bezierCurveTo(12, 12, 13, -36, 0, nose);
  paint(ctx, colour.body, art.ink, 3);
  ellipse(ctx, 0, -13, 8, 14, art.craft.glass, art.ink, 2);
}

function tail(ctx, art, fill, wide = 25) {
  polygon(ctx, [[-4, 28], [-wide, 40], [-wide, 47], [0, 41], [wide, 47], [wide, 40], [4, 28]], fill, art.ink, 3);
}

const DRAWERS = {
  propeller(ctx, art, colour, time) {
    polygon(ctx, [[-8, -15], [-48, 2], [-48, 15], [-7, 8], [7, 8], [48, 15], [48, 2], [8, -15]], colour.body, art.ink, 3);
    tail(ctx, art, colour.body);
    body(ctx, art, colour);
    propeller(ctx, art, time);
  },
  biplane(ctx, art, colour, time) {
    tail(ctx, art, colour.body, 23);
    roundedRect(ctx, -48, 1, 96, 13, 6);
    paint(ctx, colour.dark, art.ink, 3);
    line(ctx, [[-34, -12], [-34, 15]], art.ink, 2);
    line(ctx, [[34, -12], [34, 15]], art.ink, 2);
    roundedRect(ctx, -52, -17, 104, 15, 7);
    paint(ctx, colour.body, art.ink, 3);
    body(ctx, art, colour);
    propeller(ctx, art, time);
  },
  jet(ctx, art, colour, time) {
    polygon(ctx, [[-7, -25], [-49, 22], [-46, 32], [-8, 13], [8, 13], [46, 32], [49, 22], [7, -25]], colour.body, art.ink, 3);
    tail(ctx, art, colour.light, 23);
    body(ctx, art, colour, true);
    ellipse(ctx, 0, 35, 5, 7, art.craft.metal, art.ink, 2);
    ctx.save();
    ctx.translate(0, 36);
    ctx.rotate(time * 12);
    line(ctx, [[-4, 0], [4, 0]], art.white, 1.5);
    ctx.restore();
  },
  seaplane(ctx, art, colour, time) {
    for (const x of [-37, 25]) {
      roundedRect(ctx, x, -12, 12, 56, 6);
      paint(ctx, art.craft.float, art.ink, 3);
    }
    polygon(ctx, [[-8, -12], [-49, 1], [-47, 13], [-7, 8], [7, 8], [47, 13], [49, 1], [8, -12]], colour.body, art.ink, 3);
    tail(ctx, art, colour.body);
    body(ctx, art, colour);
    propeller(ctx, art, time);
  },
  stunt(ctx, art, colour, time) {
    polygon(ctx, [[-6, -20], [-51, -2], [-43, 19], [-8, 8], [8, 8], [43, 19], [51, -2], [6, -20]], colour.body, art.ink, 3);
    polygon(ctx, [[-44, 0], [-29, 1], [-37, 14]], art.craft.trim, art.ink, 2);
    polygon(ctx, [[44, 0], [29, 1], [37, 14]], art.craft.trim, art.ink, 2);
    tail(ctx, art, colour.body, 20);
    body(ctx, art, colour);
    starPath(ctx, 0, 22, 7, 3.4);
    paint(ctx, art.white, art.ink, 1.5);
    propeller(ctx, art, time, -44, 26);
  },
  paper(ctx, art, colour, time) {
    ctx.save();
    ctx.rotate(Math.sin(time * 2) * 0.02);
    polygon(ctx, [[0, -52], [-48, 40], [-10, 25], [0, 46], [10, 25], [48, 40]], colour.body, art.ink, 3);
    polygon(ctx, [[0, -52], [0, 46], [10, 25], [48, 40]], colour.light, art.ink, 2);
    line(ctx, [[0, -45], [0, 34]], art.ink, 2);
    ctx.restore();
  },
  bubble(ctx, art, colour, time) {
    cabin(ctx, art, colour);
    rotor(ctx, art, 0, -2, time, 52);
    line(ctx, [[-18, 30], [18, 30]], art.ink, 3);
  },
  tandem(ctx, art, colour, time) {
    roundedRect(ctx, -19, -42, 38, 82, 18);
    paint(ctx, colour.body, art.ink, 3);
    ellipse(ctx, 0, -25, 14, 13, art.craft.glass, art.ink, 3);
    ellipse(ctx, 0, 23, 12, 12, art.craft.glassDark, art.ink, 3);
    rotor(ctx, art, 0, -25, time, 43);
    rotor(ctx, art, 0, 25, -time, 43);
  },
  rescue(ctx, art, colour, time) {
    cabin(ctx, art, colour, true);
    for (const x of [-39, 24]) {
      roundedRect(ctx, x, -2, 15, 35, 7);
      paint(ctx, art.craft.float, art.ink, 3);
    }
    rotor(ctx, art, 0, -2, time, 52);
    polygon(ctx, [[0, 13], [7, 20], [0, 27], [-7, 20]], art.white, art.ink, 1.5);
  },
  saucer(ctx, art, colour, time) {
    ellipse(ctx, 0, 4, 47, 35, colour.body, art.ink, 3);
    ellipse(ctx, 0, -8, 24, 22, art.craft.glass, art.ink, 3);
    for (let at = 0; at < 6; at += 1) {
      const turn = (at * Math.PI) / 3 + time * 0.8;
      ellipse(ctx, Math.cos(turn) * 35, 5 + Math.sin(turn) * 23, 4, 4, at % 2 ? art.craft.window : art.craft.trim, art.ink, 1);
    }
  },
};

function rotor(ctx, art, x, y, time, long) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(time * 14);
  line(ctx, [[-long, 0], [long, 0]], art.craft.blade, 5);
  line(ctx, [[0, -long * 0.55], [0, long * 0.55]], art.craft.blade, 4);
  ellipse(ctx, 0, 0, 5, 5, art.craft.hub, art.ink, 2);
  ctx.restore();
}

function cabin(ctx, art, colour, wide = false) {
  polygon(ctx, [[-6, 14], [-10, 48], [0, 53], [10, 48], [6, 14]], colour.body, art.ink, 3);
  tail(ctx, art, colour.body, 17);
  ellipse(ctx, 0, -3, wide ? 26 : 23, 34, colour.body, art.ink, 3);
  ctx.beginPath();
  ctx.moveTo(-18, -15);
  ctx.quadraticCurveTo(0, -43, 18, -15);
  ctx.lineTo(14, 2);
  ctx.quadraticCurveTo(0, -7, -14, 2);
  ctx.closePath();
  paint(ctx, art.craft.glass, art.ink, 3);
}

function streaks(ctx, art, time) {
  for (let at = -1; at <= 1; at += 1) line(ctx, [[at * 18, 50], [at * 22, 64 + Math.sin(time * 10 + at) * 4]], art.craft.puff, 3);
}

function lean(ctx, pose, time) {
  const bank = pose === "bankLeft" ? -1 : pose === "bankRight" ? 1 : 0;
  if (pose === "hit") ctx.rotate(Math.sin(time * 32) * 0.09);
  if (pose === "losing") ctx.rotate(Math.sin(time * 8) * 0.16);
  ctx.transform(1, 0, bank * 0.14, 1, 0, 0);
  ctx.scale(1 - Math.abs(bank) * 0.1, 1);
}

export function drawAircraft(ctx, type, x, y, size, theme, options = {}) {
  const { heading = [0, -1], pose = "idle", colour = "sunny", time = 0, balloons = 3, squared = false, hidden = false, pilot = null } = options;
  const { art } = theme;
  const shown = Object.hasOwn(DRAWERS, type) ? type : "propeller";
  const scale = size / BOX;
  ctx.save();
  if (hidden) ctx.globalAlpha = 0.5;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.atan2(heading[0], -heading[1]));
  ctx.scale(scale, scale);
  lean(ctx, POSES.includes(pose) ? pose : "idle", time);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  rimmed(ctx, theme, () => {
    drawTailBalloons(ctx, balloons, theme, { time, squared });
    if (pose === "speed" && familyOf(shown) === "plane") streaks(ctx, art, time);
    DRAWERS[shown](ctx, art, art.colours[colour] ?? art.colours.sunny, time);
  });
  ctx.restore();
  pilot?.(ctx, x + heading[0] * COCKPIT[shown] * scale, y + heading[1] * COCKPIT[shown] * scale, size * PILOT);
  if (pose === "losing") drawParachute(ctx, x, y - size * 0.62, size * 0.62, theme, { time });
  ctx.restore();
}
