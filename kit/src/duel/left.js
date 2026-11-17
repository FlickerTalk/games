import { drawMark } from "../canvas/buttons.js";

const GONE = ["left", "silent", "unreachable"];

// with no notice it was this player who left, not the friend
export const friendLeft = (status) => status?.phase === "left" && GONE.includes(status.notice);

export function drawFriendLeft(ctx, rival, status, ui) {
  if (rival && friendLeft(status)) drawMark(ctx, "close", rival.x + rival.w - 20, rival.y + rival.h - 20, 36, ui);
}
