import { drawPick, pickLayout } from "../../../kit/src/avatars/index.js";
import { friendLeft, friendNoteBox, showFriendNote } from "../../../kit/src/duel/left.js";
import { drawPlay } from "./board.js";
import { drawEnd } from "./end-art.js";
import { drawHome, drawLooks } from "./home-art.js";
import { say } from "./labels.js";

function noteOf(game, theme) {
  const { state } = game;
  if (state.screen !== "home" || !friendLeft(game.duel?.status)) return null;
  return { text: say(state.lang, "away"), lang: state.lang, ui: theme.ui, box: friendNoteBox(game.targets(), state.width, state.height) };
}

export function drawFrame(ctx, game, theme, time) {
  const { state } = game;
  const { width, height, screen } = state;
  ctx.clearRect(0, 0, width, height);
  if (screen === "play") drawPlay(ctx, game, theme, time);
  else if (screen === "end") drawEnd(ctx, game, theme, time);
  else if (screen === "looks") drawLooks(ctx, state, theme, time);
  else if (screen === "avatar" && state.pick) drawPick(ctx, pickLayout(state.pick, width, height, state.lang), state.pick, { time, lang: state.lang, ui: theme.ui });
  else drawHome(ctx, game, theme, time);
  showFriendNote(ctx.canvas, noteOf(game, theme));
}
