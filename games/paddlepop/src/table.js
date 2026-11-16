// Table units: the table is 1 wide and `length` long; seat 0 defends y = length, seat 1 defends y = 0.
export const TABLE = Object.freeze({ length: 1.5, inset: 0.16, depth: 0.05, half: 0.2, wide: 0.25, radius: 0.04 });

export const STEPS_PER_SECOND = 120;
// seconds
export const STEP = 1 / STEPS_PER_SECOND;
export const STEP_MS = 1000 / STEPS_PER_SECOND;
// table widths per second
export const PADDLE_SPEED = 2.4;

export const otherSeat = (seat) => 1 - seat;

export const goalOf = (seat) => (seat === 0 ? TABLE.length : 0);

export const frontOf = (seat) => (seat === 0 ? TABLE.length - TABLE.inset - TABLE.depth : TABLE.inset + TABLE.depth);

export const centreOf = (seat) => (seat === 0 ? TABLE.length - TABLE.inset : TABLE.inset);

export const halfOf = (paddle) => (paddle.wide > 0 ? TABLE.wide : TABLE.half);

export function movePaddle(paddle, speed = PADDLE_SPEED) {
  const half = halfOf(paddle);
  const goal = Number.isFinite(paddle.target) ? Math.min(1 - half, Math.max(half, paddle.target)) : paddle.x;
  const most = speed * STEP;
  const moved = Math.abs(goal - paddle.x) <= most ? goal : paddle.x + Math.sign(goal - paddle.x) * most;
  paddle.x = Math.min(1 - half, Math.max(half, moved));
  if (paddle.wide > 0) paddle.wide -= 1;
}
