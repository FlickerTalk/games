import { FLICK, drawPick, pickLayout, standIn } from "../../../kit/src/avatars/index.js";
import { drawPrompt, promptLayout } from "../../../kit/src/canvas/index.js";
import { drawPlay } from "./board.js";
import { drawBuild } from "./build-art.js";
import { drawEnd } from "./end-art.js";
import { drawHome, drawLooks } from "./home-art.js";

function seatOf(game) {
  const { state, relay } = game;
  if (state.mode === "flick") return { player: { who: FLICK.id }, here: true, calling: false, away: false };
  if (state.mode !== "friend" || !relay) return null;
  const { here, calling, away } = relay.status;
  return { player: standIn(state.player), here, calling, away };
}

export function drawFrame(ctx, game, theme, time) {
  const { state, relay } = game;
  const { width, height, screen } = state;
  ctx.clearRect(0, 0, width, height);
  if (screen === "play") drawPlay(ctx, state, theme, time);
  else if (screen === "build") drawBuild(ctx, state, theme, time);
  else if (screen === "end") drawEnd(ctx, state, theme, time);
  else if (screen === "looks") drawLooks(ctx, state, theme, time);
  else if (screen === "avatar" && state.pick) drawPick(ctx, pickLayout(state.pick, width, height, state.lang), state.pick, { time, lang: state.lang, ui: theme.ui });
  else drawHome(ctx, state, seatOf(game), theme, time, relay?.duty() ?? null);
  if (relay?.status.prompt && (screen === "home" || screen === "end")) {
    drawPrompt(ctx, state, theme.ui, time, { layout: promptLayout(width, height, { fill: state.fill }), player: standIn(state.player) });
  }
}
