import { EXPRESSIONS, POSES, profileOf } from "./cast.js";
import { finite, given, paintAvatar } from "./face.js";
import { CREAM, INK, TAU, circle, ellipse, line, paint, roundedRect } from "./pen.js";

const GRIP = "#FFB15C";
const FOAM = "#A9DFE8";
const NOMINAL = 190;
const HEAD = 88;

const FACES = { idle: "neutral", run: "focused", jump: "cheering", swing: "determined", kick: "determined", block: "determined", celebrate: "cheering", lose: "oops" };

function limbs(pose, time) {
  const phase = Math.sin(time * (pose === "run" ? 9 : 5));
  const at = {
    leftArm: [[-22, 0], [-31, 23], [-30, 43]],
    rightArm: [[22, 0], [31, 23], [30, 43]],
    leftLeg: [[-13, 47], [-17, 70], [-19, 91]],
    rightLeg: [[13, 47], [17, 70], [19, 91]],
  };
  if (pose === "run") {
    at.leftArm = [[-22, 0], [-35, 16 + phase * 9], [-21, 31 + phase * 13]];
    at.rightArm = [[22, 0], [35, 16 - phase * 9], [21, 31 - phase * 13]];
    at.leftLeg = [[-13, 47], [-20 - phase * 13, 68], [-29 - phase * 20, 86]];
    at.rightLeg = [[13, 47], [20 + phase * 13, 68], [29 + phase * 20, 86]];
  } else if (pose === "jump" || pose === "celebrate") {
    at.leftArm = [[-22, 0], [-35, -20], [-31, -43]];
    at.rightArm = [[22, 0], [35, -20], [31, -43]];
    at.leftLeg = [[-13, 47], [-30, 65], [-39, 81]];
    at.rightLeg = [[13, 47], [30, 65], [39, 81]];
  } else if (pose === "swing") {
    at.leftArm = [[-22, 0], [-6, 12], [18, -3]];
    at.rightArm = [[22, 0], [35, -13], [28, -27]];
  } else if (pose === "kick") {
    at.leftArm = [[-22, 0], [-38, 10], [-47, 1]];
    at.rightArm = [[22, 0], [38, 10], [47, 1]];
    at.rightLeg = [[13, 47], [37, 47], [62, 34]];
    at.leftLeg = [[-13, 47], [-18, 70], [-22, 91]];
  } else if (pose === "block") {
    at.leftArm = [[-22, 0], [-8, 8], [14, -12]];
    at.rightArm = [[22, 0], [8, 17], [-13, -5]];
    at.leftLeg = [[-13, 47], [-29, 68], [-35, 87]];
    at.rightLeg = [[13, 47], [29, 68], [35, 87]];
  } else if (pose === "lose") {
    at.leftArm = [[-22, 0], [-40, 11], [-52, 2]];
    at.rightArm = [[22, 0], [40, 11], [52, 2]];
  }
  return at;
}

function lift(pose, time) {
  if (pose === "jump") return -16 - Math.abs(Math.sin(time * 4)) * 8;
  if (pose === "celebrate") return -Math.abs(Math.sin(time * 6)) * 7;
  if (pose === "run") return -Math.abs(Math.sin(time * 9)) * 3;
  return 0;
}

function limb(ctx, points, colour, width) {
  line(ctx, points, INK, width + 6);
  line(ctx, points, colour, width);
}

function sword(ctx) {
  ctx.save();
  ctx.translate(28, -27);
  ctx.rotate(0.72);
  line(ctx, [[0, 3], [0, 17]], INK, 8);
  line(ctx, [[0, 3], [0, 17]], GRIP, 4);
  line(ctx, [[0, -44], [0, 0]], INK, 13);
  line(ctx, [[0, -44], [0, 0]], FOAM, 7);
  circle(ctx, 0, -46, 6.5, FOAM, INK, 3);
  ctx.restore();
}

function body(ctx, at, colour) {
  limb(ctx, at.leftLeg, colour, 12);
  limb(ctx, at.rightLeg, colour, 12);
  for (const [x, y] of [at.leftLeg[2], at.rightLeg[2]]) ellipse(ctx, x + 3, y + 2, 13, 7, colour, INK, 3);
  limb(ctx, at.leftArm, colour, 10);
  limb(ctx, at.rightArm, colour, 10);
  roundedRect(ctx, -25, -12, 50, 67, 20);
  paint(ctx, colour, INK, 3.5);
  ctx.beginPath();
  ctx.arc(0, 20, 8, 0, TAU);
  paint(ctx, null, CREAM, 2.5);
  for (const [x, y] of [at.leftArm[2], at.rightArm[2]]) circle(ctx, x, y, 7, colour, INK, 3);
}

export function drawFigure(ctx, x, y, size, options) {
  if (!(size > 0 && Number.isFinite(size))) return;
  const chosen = given(options);
  const time = finite(chosen.time);
  const pose = POSES.includes(chosen.pose) ? chosen.pose : "idle";
  const motion = ["run", "jump", "swing", "kick"].includes(pose) ? Math.sin(time * 7) : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(chosen.flip ? -size / NOMINAL : size / NOMINAL, size / NOMINAL);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.translate(0, lift(pose, time));
  body(ctx, limbs(pose, time), profileOf(chosen.who).colour);
  if (pose === "swing") sword(ctx);
  ctx.translate(0, -48);
  ctx.scale(HEAD / 100, HEAD / 100);
  paintAvatar(ctx, { ...chosen, face: EXPRESSIONS.includes(chosen.face) ? chosen.face : FACES[pose], time, motion }, (HEAD * size) / NOMINAL);
  ctx.restore();
}
