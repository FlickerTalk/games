import { FINISH_MS, hang, saveOwnState, showPicture, spread, teach, tokenOf } from "./colouring.js";
import { SLOTS, saveShared } from "./keep.js";
import { PROGRESS, finishPicture } from "./levels.js";

const inTogether = (state) => state.screen === "duo" || (state.screen === "shelf" && state.choosing) || (state.screen === "picture" && state.picture?.from === "duo");

function newFills(game, shared, mine) {
  const { state } = game;
  if (state.page !== shared.page || !shared.page) return;
  const seen = state.seenFills ?? {};
  for (const [zone, token] of Object.entries(shared.fills)) {
    if (seen[zone] === token) continue;
    const touch = mine && state.touch?.zone === Number(zone) ? state.touch.point : null;
    spread(game, Number(zone), touch, seen[zone], mine ? "me" : "them");
    game.sound.play("tick", { pitch: mine ? 1 : 0.85 });
  }
}

function finished(game, status) {
  const { state } = game;
  const key = `${game.duo.record?.id}/${status.index}`;
  if (state.picture?.from === "duo" && state.picture.key === key) return;
  let gift = null;
  if (state.lastShared !== key) {
    const slot = state.shared % SLOTS;
    const { page, fills } = status.state;
    game.run(() => saveShared(game.store, slot, { page, fills }));
    hang(game, `s:${slot}`);
    const award = finishPicture(state.progress);
    state.progress = award.record;
    gift = award.gift;
    game.run(() => PROGRESS.save(game.store, award.record));
    state.shared += 1;
    state.lastShared = key;
    saveOwnState(game);
    game.sound.play(gift ? "win" : "success");
  }
  showPicture(game, { kind: "shared", key, page: status.state.page, work: { fills: status.state.fills, items: [] }, from: "duo", gift, opened: false });
}

export function follow(game, entering = false) {
  const { state, duo } = game;
  if (!duo || (!entering && !inTogether(state))) return;
  const status = duo.status;
  const shared = status.state;
  const seat = game.duo.table.view?.mySide;
  const lastSide = (shared.moves - 1) % 2;
  newFills(game, shared, lastSide === seat);
  state.seenFills = { ...shared.fills };
  state.touch = null;
  if (status.phase === "over") {
    if (state.screen !== "duo") return finished(game, status);
    if (state.endAt === null) state.endAt = game.now() + FINISH_MS;
    return game.relayout();
  }
  const choose = status.phase === "play" && shared.page === null && status.myTurn;
  state.choosing = choose;
  state.screen = choose ? "shelf" : "duo";
  if (!choose) state.page = shared.page;
  if (choose && !entering) state.shelfPage = 0;
  game.relayout();
}

export function duoFinished(game) {
  game.state.endAt = null;
  if (game.duo?.status.phase === "over") finished(game, game.duo.status);
}

export async function startDuo(game) {
  game.state.seenFills = null;
  game.state.shelfPage = 0;
  await game.duo.start();
  game.state.page = game.duo.status.state.page;
  game.state.seenFills = { ...game.duo.status.state.fills };
  follow(game, true);
}

export async function duoPick(game, id) {
  await game.duo.choose(id);
  follow(game, true);
}

export async function duoFill(game, zone, point) {
  const { state, duo } = game;
  if (!duo.status.myTurn) return;
  state.touch = { zone, point: point && [point.x, point.y] };
  teach(game);
  await duo.fill(zone, tokenOf(state));
}
