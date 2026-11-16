import { randomOf } from "../../../kit/src/canvas/random.js";
import { rivalPace } from "../../../kit/src/progress/rival.js";
import { SLOW } from "./ball.js";
import { TABLE, frontOf } from "./table.js";

const R = TABLE.radius;
const PACE = { even: 0, full: 3, slowest: 0.75, fastest: 1.1 };
const ERROR_BASE = 0.18;
const ERROR_SPAN = 0.3;
const ERROR_ANGLE = 0.1;

const coming = (ball, seat) => !ball.out && (seat === 0 ? ball.vy > 0 : ball.vy < 0);

function fold(x) {
  const span = 1 - 2 * R;
  const along = (((x - R) % (2 * span)) + 2 * span) % (2 * span);
  return R + (along <= span ? along : 2 * span - along);
}

export function landing(ball, seat) {
  const line = seat === 0 ? frontOf(0) - R : frontOf(1) + R;
  const time = (line - ball.y) / ball.vy;
  return fold(ball.x + ball.vx * Math.max(0, time));
}

function soonest(match, seat) {
  const line = frontOf(seat);
  const factor = (ball) => (ball.slow > 0 ? SLOW : 1);
  const time = (ball) => Math.abs(line - ball.y) / (Math.abs(ball.vy) * factor(ball));
  return match.balls.filter((ball) => coming(ball, seat)).sort((one, two) => time(one) - time(two))[0] ?? null;
}

function missBy(match, ball, skill) {
  const random = randomOf(`${match.seed}/flick/${match.rally.k}/${ball.i}/${ball.v}`);
  const steep = Math.abs(ball.vx) / Math.hypot(ball.vx, ball.vy);
  return (random() * 2 - 1) * (ERROR_BASE + (1 - skill) * ERROR_SPAN + ERROR_ANGLE * steep);
}

export function flickTarget(match, seat, { skill }) {
  const pace = rivalPace(match.lost[1 - seat] - match.lost[seat], PACE);
  const sure = Math.min(1, Math.max(0, skill * pace));
  const ball = soonest(match, seat);
  if (!ball) return 0.5;
  const reach = TABLE.length * (0.35 + 0.55 * sure);
  if (Math.abs(frontOf(seat) - ball.y) > reach) return 0.5;
  return landing(ball, seat) + missBy(match, ball, sure);
}

export const flickSpeed = (skill) => 0.55 + 0.45 * Math.min(1, Math.max(0, skill));
