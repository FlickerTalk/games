import { Friend } from "./friend.js";
import { closeDue, freshKick, heldBack, launch, newRound, showRound, stepKick } from "./rounds.js";

// ms
const BEFORE_KICK = 250;
const KEEPER_REACTS = 100;
const ASK_AGAIN = 3000;
const SHOWING = ["fly", "result"];

export const roundKey = (seen) => `${seen.me}/${seen.index}`;

export async function joinFriend(game, opening) {
  game.friend = new Friend({ ft: game.ft, opening: { ...opening, chat: game.state.chat }, app: game.app, onChange: () => game.onChange() });
  await game.friend.ready();
}

export function startFriend(game) {
  const { friend, state } = game;
  return game.run(async () => {
    await friend.start();
    const seen = friend.seen;
    if (seen?.phase === "over" && roundKey(seen) === state.awarded) await friend.again();
  });
}

function enter(game, seen) {
  const { state } = game;
  if (seen.phase === "over" && roundKey(seen) === state.awarded) return;
  const round = newRound(game, { kind: "friend", seat: seen.mySide, kicks: seen.state.kicks, index: seen.index });
  showRound(game, round);
  if (seen.phase === "over") round.endAt = game.now();
}

function showKick(game, round, played, now) {
  const kick = freshKick(round, "fly", now);
  Object.assign(kick, { dive: played.dive, diveAt: now + BEFORE_KICK + KEEPER_REACTS, preset: { outcome: played.outcome, bonus: played.bonus } });
  launch(game, kick, played.aim, { delay: BEFORE_KICK });
  round.kick = kick;
}

function revealOnce(game, round, seen, now) {
  const key = `${seen.index}/${seen.state.kicks.length}`;
  if (round.revealed === key && now - round.revealedAt < ASK_AGAIN) return;
  Object.assign(round, { revealed: key, revealedAt: now });
  game.run(() => game.friend.reveal());
}

function phaseFor(seen, kick, now) {
  const { phase } = seen.state;
  if (!seen.myTurn) return "wait";
  if (kick?.acted === phase && now - kick.actedAt < ASK_AGAIN) return "wait";
  return phase === "commit" ? "aim" : phase === "dive" ? "guess" : "wait";
}

function follow(game, round, seen, now) {
  const played = seen.state.kicks;
  if (round.kick && SHOWING.includes(round.kick.phase)) return stepKick(game, round, now);
  if (played.length > round.kicks.length) return showKick(game, round, played[round.kicks.length], now);
  if (seen.phase !== "play") return undefined;
  if (!round.kick || round.kick.index !== played.length) round.kick = freshKick(round, "wait", now);
  round.kick.phase = phaseFor(seen, round.kick, now);
  if (seen.myTurn && seen.state.phase === "reveal") revealOnce(game, round, seen, now);
  return undefined;
}

export function advanceFriend(game) {
  const { state, friend } = game;
  const seen = friend.seen;
  const now = game.now();
  if (state.screen !== "play") {
    if (friend.wanted && seen && friend.status.playing && ["home", "end"].includes(state.screen)) enter(game, seen);
    return;
  }
  const { round } = state;
  if (!round || round.kind !== "friend" || heldBack(game, round, now) || closeDue(game, round, now)) return;
  if (seen && seen.index === round.index) follow(game, round, seen, now);
}
