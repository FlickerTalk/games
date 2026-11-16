import { drawPick, pickLayout } from "../../../kit/src/avatars/index.js";
import { drawPlay } from "./board.js";
import { drawEnd, drawPrompt } from "./end-art.js";
import { drawHome, drawLooks } from "./home-art.js";

export function drawFrame(ctx, game, theme, time) {
  const { state } = game;
  const { width, height, screen } = state;
  ctx.clearRect(0, 0, width, height);
  if (screen === "play") drawPlay(ctx, game, theme, time);
  else if (screen === "end") drawEnd(ctx, game, theme, time);
  else if (screen === "looks") drawLooks(ctx, state, theme, time);
  else if (screen === "avatar" && state.pick) drawPick(ctx, pickLayout(state.pick, width, height, state.lang), state.pick, { time, lang: state.lang, ui: theme.ui });
  else drawHome(ctx, game, theme, time);
  if (game.friend?.status.prompt && (screen === "home" || screen === "end")) drawPrompt(ctx, state, theme, time);
}
