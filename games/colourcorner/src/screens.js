import { pickLayout } from "../../../kit/src/avatars/index.js";
import { homeLayout, promptLayout } from "../../../kit/src/canvas/index.js";
import { zonesOf, required } from "./geometry.js";
import { gridLayout, pictureLayout, screenLayout, soundLine, stripTargets } from "./layout.js";
import { PAGE_ORDER, pageOf } from "./pages.js";
import { PATTERNS } from "./paints.js";
import { PAINT_KEYS } from "./theme.js";
import { STAMPS } from "./work.js";

export const PAGE_TOOLS = Object.freeze(["fill", "brush", "eraser"]);
export const FREE_TOOLS = Object.freeze(["brush0", "brush1", "brush2", "eraser", "mirror", ...STAMPS.map((_, at) => `stamp${at}`), "paper0", "paper1", "paper2"]);

const ZONE_BOX = 24;
const colourItems = PAINT_KEYS.map((_, at) => ({ kind: "paint", value: at }));
const patternItems = PATTERNS.map((name) => ({ kind: "pattern", value: name }));
const toolItems = (tools) => tools.map((tool) => ({ kind: "tool", value: tool }));

export const variantsOf = (state) => (state.mode === "alone" ? ["pages", "free"] : ["pages", "free", "together"]);

export function canSend(game) {
  const { state } = game;
  return Boolean(state.chat) && state.mode !== "flick" && typeof game.ft?.send === "function";
}

export function pictureActions(game) {
  const { picture } = game.state;
  const send = canSend(game) ? ["send"] : [];
  return picture?.kind === "shared" ? send : ["edit", ...send];
}

export function layoutFor(game) {
  const { state } = game;
  const { width, height, fill, screen } = state;
  if (screen === "page") return screenLayout(width, height, { fill, left: ["back", "undo"], tools: toolItems(PAGE_TOOLS), paints: [...colourItems, ...patternItems] });
  if (screen === "free") return screenLayout(width, height, { fill, left: ["back", "undo", "done"], tools: toolItems(FREE_TOOLS), paints: colourItems });
  if (screen === "duo") return screenLayout(width, height, { fill, left: ["back"], rival: true, paints: [...colourItems, ...patternItems] });
  if (screen === "shelf") return gridLayout(width, height, { fill, count: PAGE_ORDER.length, page: state.shelfPage });
  if (screen === "gallery") return gridLayout(width, height, { fill, count: state.pictures.length, page: state.wallPage });
  if (screen === "picture") return pictureLayout(width, height, { fill, actions: pictureActions(game), gift: Boolean(state.picture?.gift && !state.picture.opened) });
  return { volume: soundLine(width, height) };
}

function zoneTargets(state) {
  const page = pageOf(state.page);
  const box = state.layout.page;
  if (!page) return [];
  const zones = zonesOf(page);
  return required(page).map((zone) => {
    const [x, y] = zones[zone].anchor;
    return { kind: "zone", value: zone, x: box.x + x * box.scale - ZONE_BOX / 2, y: box.y + y * box.scale - ZONE_BOX / 2, w: ZONE_BOX, h: ZONE_BOX };
  });
}

function drawingTargets(game) {
  const { state } = game;
  const { layout } = state;
  const strips = layout.strips.flatMap((one) => stripTargets(one, state.scroll[one.id] ?? 0));
  const myTurn = state.screen !== "duo" || game.duo?.status.myTurn;
  const zones = myTurn && (state.screen !== "page" || state.tool === "fill") && state.screen !== "free" ? zoneTargets(state) : [];
  return [...layout.buttons, ...strips, ...zones];
}

function withVolume(state, targets) {
  const volume = state.layout?.volume;
  return state.sound.open && volume ? [{ kind: "volume", value: "volume", ...volume }, ...targets] : targets;
}

export function targetsOf(game) {
  const { state } = game;
  const { width, height, fill, screen } = state;
  const prompt = game.duo?.status.prompt && ["home", "picture"].includes(screen);
  if (prompt) return promptLayout(width, height, { fill }).targets;
  if (screen === "home") return withVolume(state, homeLayout(width, height, { variants: variantsOf(state), rival: state.mode !== "alone", fill }).targets);
  if (screen === "avatar" && state.pick) return pickLayout(state.pick, width, height, state.lang).targets.filter((one) => one.visible);
  if (!state.layout?.buttons) return [];
  if (screen === "shelf") return withVolume(state, [...state.layout.buttons, ...state.layout.tiles.map((tile) => ({ ...tile, value: PAGE_ORDER[tile.value] }))]);
  if (screen === "gallery" || screen === "picture") return withVolume(state, [...state.layout.buttons, ...(state.layout.tiles ?? [])]);
  return withVolume(state, drawingTargets(game));
}
