import { drawPick, pickLayout, standIn } from "../../../kit/src/avatars/index.js";
import { drawAlbum } from "./album-art.js";
import { drawPlay } from "./board.js";
import { drawEnd, drawPrompt } from "./end-art.js";
import { drawHome, drawLooks } from "./home-art.js";

const FLICK = Object.freeze({ who: "flick" });

function seatOf(game) {
  const { state, duel } = game;
  if (state.mode === "flick") return { player: FLICK, here: true, calling: false, away: false };
  if (state.mode !== "friend" || !duel) return null;
  const { here, calling, away } = duel.status;
  return { player: standIn(state.player), here, calling, away };
}

function friendOf(game) {
  const { state, duel } = game;
  if (state.mode !== "friend" || !duel || !state.setup) return null;
  const index = state.outcome?.duelIndex ?? state.setup.duelIndex;
  const theirs = duel.results(index).theirs;
  return { kind: "friend", player: standIn(state.player), score: theirs?.score ?? null, thinking: !theirs };
}

function rivalAtEnd(game) {
  if (game.state.mode === "flick") return { kind: "flick", score: game.state.outcome?.flick ?? null };
  return friendOf(game);
}

export function drawFrame(ctx, game, theme, time) {
  const { state } = game;
  const { width, height, screen } = state;
  ctx.clearRect(0, 0, width, height);
  if (screen === "play") drawPlay(ctx, { ...state, friend: friendOf(game) }, theme, time);
  else if (screen === "end") drawEnd(ctx, { ...state, friend: friendOf(game) }, rivalAtEnd(game), theme, time);
  else if (screen === "looks") drawLooks(ctx, state, theme, time);
  else if (screen === "album") drawAlbum(ctx, state, theme, time);
  else if (screen === "avatar" && state.pick) drawPick(ctx, pickLayout(state.pick, width, height, state.lang), state.pick, { time, lang: state.lang, ui: theme.ui });
  else drawHome(ctx, state, seatOf(game), theme, time);
  if (game.duel?.status.prompt && (screen === "home" || screen === "end")) drawPrompt(ctx, state, standIn(state.player), theme, time);
}
