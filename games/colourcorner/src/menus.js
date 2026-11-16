import { startPick } from "../../../kit/src/avatars/index.js";
import { fillAt, finishFree, openFree, openPage, saveOwnState, setPaper, undo } from "./colouring.js";
import { duoFill, duoPick, startDuo } from "./together.js";
import { loadPicture, loadWork } from "./keep.js";
import { pageOf } from "./pages.js";
import { openPages } from "./levels.js";
import { PAPER_KINDS } from "./work.js";

const SHAKE_MS = 600;

function show(game, screen) {
  game.state.screen = screen;
  game.relayout();
}

export async function openGallery(game) {
  const { state } = game;
  const found = await Promise.all(state.wall.map((entry) => loadPicture(game.store, entry)));
  state.pictures = found.filter(Boolean);
  state.wallPage = 0;
  show(game, "gallery");
}

export async function openShelf(game) {
  const { state } = game;
  const owned = openPages(state.progress);
  const found = await Promise.all(owned.map(async (id) => [id, await loadWork(game.store, pageOf(id))]));
  state.thumbs = Object.fromEntries(found);
  show(game, "shelf");
}

function shelfTile(game, id) {
  const { state } = game;
  if (!openPages(state.progress).includes(id)) {
    state.moments.push({ kind: "shake", id, start: game.now(), duration: SHAKE_MS });
    game.sound.play("error-soft");
    return;
  }
  game.sound.play("tap");
  if (state.choosing) return void game.run(() => duoPick(game, id));
  game.run(() => openPage(game, id));
}

function freeTool(game, value) {
  const { state } = game;
  if (value === "mirror") state.mirror = !state.mirror;
  else if (value.startsWith("paper")) setPaper(game, PAPER_KINDS[Number(value.slice(5))]);
  else state.freeTool = value;
}

function choosePaint(game, value) {
  const { state } = game;
  state.colour = value;
  state.pattern = null;
  if (state.tool === "eraser") state.tool = "fill";
  if (state.freeTool === "eraser") state.freeTool = "brush1";
  game.sound.play("pick");
  saveOwnState(game);
}

function choosePattern(game, value) {
  game.state.pattern = value;
  game.state.tool = "fill";
  game.sound.play("pick");
  saveOwnState(game);
}

function back(game) {
  const { state } = game;
  const toShelf = state.screen === "page";
  state.choosing = false;
  state.stroke = null;
  if (toShelf) return game.run(() => openShelf(game));
  return show(game, "home");
}

function edit(game) {
  const { picture } = game.state;
  if (picture?.kind === "page") return game.run(() => openPage(game, picture.page));
  if (picture?.kind === "free") return game.run(() => openFree(game, { picture }));
  return undefined;
}

function play(game) {
  const { state } = game;
  const { picture } = state;
  if (state.screen === "picture" && picture?.from === "free") return game.run(() => openFree(game, { fresh: true }));
  if (state.screen === "picture" && picture?.from === "duo") return game.run(() => game.duo.again());
  if (state.variant === "free" && state.screen === "home") return game.run(() => openFree(game));
  if (state.variant === "together" && state.screen === "home") return game.run(() => startDuo(game));
  state.shelfPage = 0;
  return game.run(() => openShelf(game));
}

function zone(game, value) {
  if (game.state.screen === "duo") return game.run(() => duoFill(game, value, null));
  return fillAt(game, value);
}

const ACTIONS = {
  speaker(game) {
    game.controls.toggle();
    game.state.volumeAt = game.now();
  },
  music: (game) => game.controls.toggleMusic(),
  avatar(game) {
    game.state.pick = startPick(game.state.player);
    show(game, "avatar");
  },
  looks: (game) => game.run(() => openGallery(game)),
  variant(game, value) {
    game.state.variant = value;
    saveOwnState(game);
  },
  play,
  rival: (game) => game.duo && !game.duo.status.here && game.run(() => game.duo.retry()),
  accept: (game) => game.run(() => game.duo.accept()),
  dismiss: (game) => game.duo.dismiss(),
  back,
  home: (game) => show(game, "home"),
  prev(game) {
    const key = game.state.screen === "gallery" ? "wallPage" : "shelfPage";
    game.state[key] = Math.max(0, game.state[key] - 1);
    game.relayout();
  },
  next(game) {
    const key = game.state.screen === "gallery" ? "wallPage" : "shelfPage";
    game.state[key] = Math.min(game.state.layout.pages - 1, game.state[key] + 1);
    game.relayout();
  },
  tile(game, value) {
    if (game.state.screen === "shelf") return shelfTile(game, value);
    const picture = game.state.pictures[value];
    if (picture) game.state.picture = { ...picture, from: "gallery", gift: null, opened: false };
    return picture && show(game, "picture");
  },
  tool(game, value) {
    if (game.state.screen === "free") freeTool(game, value);
    else game.state.tool = value;
    game.sound.play("tap");
  },
  paint: choosePaint,
  pattern: choosePattern,
  undo,
  done: finishFree,
  edit,
  send: (game) => game.run(() => game.sendPicture()),
  gift(game) {
    game.state.picture.opened = true;
    game.sound.play("star");
    game.relayout();
  },
  zone,
};

export function act(game, target) {
  ACTIONS[target.kind]?.(game, target.value);
  game.syncSound();
}
