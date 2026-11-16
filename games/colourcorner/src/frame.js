import { drawPick, pickLayout, standIn } from "../../../kit/src/avatars/index.js";
import { drawPrompt, promptLayout } from "../../../kit/src/canvas/index.js";
import { drawGallery, drawHomeScreen, drawPictureScreen, drawShelf } from "./menus-art.js";
import { drawWork } from "./screen-art.js";

const DRAW = { home: drawHomeScreen, shelf: drawShelf, gallery: drawGallery, picture: drawPictureScreen, page: drawWork, free: drawWork, duo: drawWork };

export function drawFrame(ctx, game, theme, time) {
  const { state } = game;
  const { width, height, screen } = state;
  ctx.clearRect(0, 0, width, height);
  if (screen === "avatar" && state.pick) drawPick(ctx, pickLayout(state.pick, width, height, state.lang), state.pick, { time, lang: state.lang, ui: theme.ui });
  else if (state.layout) (DRAW[screen] ?? drawHomeScreen)(ctx, game, theme, time);
  if (game.prompting()) drawPrompt(ctx, { ...state, player: standIn(state.player) }, theme.ui, time, { layout: promptLayout(width, height, { fill: state.fill }), player: standIn(state.player) });
}
