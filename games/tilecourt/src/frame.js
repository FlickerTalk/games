import { drawPick, pickLayout, standIn } from "../../../kit/src/avatars/index.js";
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

function friendDuring(game) {
  const { state, duel } = game;
  if (state.rival?.kind !== "friend" || !duel || !state.snapshot) return null;
  const { theirs } = duel.results(state.snapshot.duelIndex);
  return { player: standIn(state.player), score: theirs?.score ?? null, thinking: !theirs };
}

function rivalAtEnd(game) {
  const { state, duel } = game;
  const { outcome } = state;
  if (outcome?.rival) return { player: FLICK, score: outcome.rival.score };
  if (state.rival?.kind !== "friend" || !duel) return null;
  const { mine, theirs } = duel.results(outcome.duelIndex);
  return { player: standIn(state.player), score: theirs?.score ?? null, won: theirs ? mine.score >= theirs.score : undefined };
}

export function drawFrame(ctx, game, theme, time) {
  const { state } = game;
  const { width, height, screen } = state;
  ctx.clearRect(0, 0, width, height);
  if (screen === "play") drawPlay(ctx, { ...state, friend: friendDuring(game) }, theme, time);
  else if (screen === "end") drawEnd(ctx, state, rivalAtEnd(game), theme, time);
  else if (screen === "looks") drawLooks(ctx, state, theme, time);
  else if (screen === "avatar" && state.pick) drawPick(ctx, pickLayout(state.pick, width, height, state.lang), state.pick, { time, lang: state.lang });
  else drawHome(ctx, state, seatOf(game), theme, time);
  if (game.duel?.status.prompt && (screen === "home" || screen === "end")) drawPrompt(ctx, { ...state, player: standIn(state.player) }, theme, time);
}
