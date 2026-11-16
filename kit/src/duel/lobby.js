import { drawMark } from "../canvas/buttons.js";
import { centreOf } from "../canvas/layout.js";
import { TAU, circle } from "../canvas/pen.js";

const BEFORE = ["waiting", "lobby"];
const DOTS = 8;
// turns a second
const TURN = 0.35;

// From CanvasDuel's status: `waiting`, this player started and the other has not; `invited`, the other started first.
export function lobbyOf(status) {
  if (!status || status.away || !BEFORE.includes(status.phase)) return { waiting: false, invited: false };
  const me = Boolean(status.ready?.me);
  const them = Boolean(status.here && status.ready?.them);
  return { waiting: me && !them, invited: them && !me };
}

function waitingDots(ctx, target, ui, time) {
  const [x, y] = centreOf(target);
  const size = Math.min(target.w, target.h);
  const reach = size / 2 - Math.max(9, size * 0.1);
  const dot = Math.max(2.5, size * 0.035);
  const head = Math.floor(time * TURN * DOTS);
  for (let at = 0; at < DOTS; at += 1) {
    const turn = (at / DOTS) * TAU - Math.PI / 2;
    const behind = (((head - at) % DOTS) + DOTS) % DOTS;
    ctx.globalAlpha = 1 - (behind / DOTS) * 0.8;
    circle(ctx, x + Math.cos(turn) * reach, y + Math.sin(turn) * reach, dot, ui.onAccent);
  }
}

// Over the kit's home screen, on its `play` and `rival` targets: what the two players see while one waits for the other.
export function drawLobby(ctx, { play = null, rival = null }, lobby, ui, time) {
  ctx.save();
  if (lobby.waiting && play) waitingDots(ctx, play, ui, time);
  ctx.globalAlpha = 1;
  if (lobby.invited && rival) drawMark(ctx, "play", rival.x + rival.w - 20, rival.y + rival.h - 20, 36, ui);
  ctx.restore();
}
