// A match as each phone keeps it (README, "The match"). The whole of it travels in every message
// and nothing in it is trusted: what arrives is replayed through the game's rules from the first
// move, the coin is checked against its commitment, and a phone can only add moves for its own
// side. A match is a series: when a round ends, either side may start the next one.

import { coinCommit, coinToss, fromHex, hex, randomBytes, verifyCoin } from "./commit.js";
import { isId } from "./envelope.js";

/** Where matches are kept in the plugin's records: `game/<id>`. */
export const PREFIX = "game/";
/** The version of a kept record. */
export const RECORD = 1;

const HEX64 = /^[0-9a-f]{64}$/;
const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/** A random plain id: 16 letters and digits. */
export function newId() {
  return Array.from(randomBytes(16), (byte) => ALPHABET[byte % 36]).join("");
}

/** A new match, mine alone until the other phone joins it. */
export function newMatch({ g, gv, id = newId(), me = newId(), now = Date.now() }) {
  return {
    v: RECORD,
    g,
    gv,
    id,
    me,
    game: { a: me, b: null, first: null, toss: {}, moves: [], end: null },
    secret: null,
    heard: 0,
    fork: null,
    created: now,
    updated: now,
  };
}

/** The other participant, once known. */
export function peerOf(record) {
  const { a, b } = record.game;
  return (record.me === a ? b : a) ?? null;
}

/** What may stand in a match's list: a move (a number or a string), a resignation, a new round. */
export function isEvent(value) {
  if (typeof value === "string") return value.length > 0 && value.length <= 64;
  if (typeof value === "number") return Number.isFinite(value);
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return value.x === "next" || (value.x === "resign" && isId(value.by));
}

const same = (one, two) => JSON.stringify(one) === JSON.stringify(two);

/**
 * The match played again from the start through the rules: its rounds (who started, the state,
 * the moves, how it ended) and who made each event. `{ ok: false, at, error }` at the first one
 * that does not hold.
 */
export function replay(game, rules) {
  const moves = Array.isArray(game.moves) ? game.moves : null;
  const fail = (at, error) => ({ ok: false, at, error });
  if (!moves) return fail(0, "bad");
  if (moves.length && !game.first) return fail(0, "toss");
  const other = (who) => (who === game.a ? game.b : game.a);
  const fresh = (starter) => ({ starter, state: rules.initial(), moves: [], end: null });
  const rounds = [];
  const actors = [];
  let round = game.first ? fresh(game.first) : null;
  for (let at = 0; at < moves.length; at += 1) {
    const event = moves[at];
    if (!isEvent(event)) return fail(at, "bad");
    if (event.x === "next") {
      if (!round.end) return fail(at, "on");
      rounds.push(round);
      round = fresh(other(round.starter));
      actors.push(null);
      continue;
    }
    if (round.end) return fail(at, "over");
    if (event.x === "resign") {
      if (event.by !== game.a && event.by !== game.b) return fail(at, "bad");
      round.end = { k: "resign", by: event.by, winner: other(event.by) };
      actors.push(event.by);
      continue;
    }
    const side = rules.turn(round.state);
    let played;
    try {
      played = rules.play(round.state, event, side);
    } catch {
      played = { error: "bad" };
    }
    if (!played || played.error) return fail(at, played?.error ?? "bad");
    round.state = played.state;
    round.moves.push(event);
    actors.push(side === 0 ? round.starter : other(round.starter));
    const result = rules.result(round.state);
    if (result) {
      const winner = result.winner === null || result.winner === undefined ? null : result.winner === 0 ? round.starter : other(round.starter);
      round.end = { k: "rules", winner, result };
    }
  }
  if (round) rounds.push(round);
  return { ok: true, rounds, actors };
}

/** The series so far, as `me` sees it. */
export function score(played, me) {
  const tally = { me: 0, them: 0, draws: 0 };
  for (const round of played.rounds ?? []) {
    if (!round.end) continue;
    if (round.end.winner === null) tally.draws += 1;
    else if (round.end.winner === me) tally.me += 1;
    else tally.them += 1;
  }
  return tally;
}

/** An end of the whole match, which gives nobody a win: abandoned, or invalid (a bad coin). */
const validEnd = (end, game) =>
  Boolean(end) && typeof end === "object" && (end.k === "abandoned" || end.k === "invalid") && (end.by === game.a || end.by === game.b);

/**
 * The next step of the coin toss on this phone, if it is mine to take: the starter commits; the
 * other sends its seed only after the commitment; the starter reveals once the seed is in. Saved
 * before it is said. `send` is the message to say: `commit`, `seed`, `reveal`, or null.
 */
export async function tossStep(record, { random = randomBytes } = {}) {
  const { game, me } = record;
  if (game.end || game.first || !game.b) return { record, send: null };
  const toss = game.toss;
  const next = structuredClone(record);
  if (me === game.a && !toss.c) {
    const secret = random();
    next.secret = hex(secret);
    next.game.toss.c = await coinCommit(record.id, secret);
    return { record: next, send: "commit" };
  }
  if (me === game.b && toss.c && !toss.s) {
    next.game.toss.s = hex(random());
    return { record: next, send: "seed" };
  }
  if (me === game.a && toss.c && toss.s && !toss.r && record.secret) {
    next.game.toss.r = record.secret;
    next.game.first = (await coinToss(record.id, fromHex(record.secret), fromHex(toss.s))) === 0 ? game.a : game.b;
    return { record: next, send: "reveal" };
  }
  return { record, send: null };
}

/** What the other phone says of the coin, taken as far as it may be. */
async function mergeToss(next, theirs) {
  const { game, me } = next;
  const toss = game.toss;
  const said = theirs && typeof theirs === "object" ? theirs : {};
  const invalid = () => {
    game.end = { k: "invalid", by: game.a };
  };
  if (me === game.a) {
    if (toss.c && !toss.s && HEX64.test(said.s ?? "")) toss.s = said.s;
    return;
  }
  if (said.c !== undefined && toss.c && said.c !== toss.c) return invalid();
  if (!toss.c && !toss.s && HEX64.test(said.c ?? "")) toss.c = said.c;
  if (toss.c && toss.s && !toss.r && said.r !== undefined) {
    const r = HEX64.test(said.r) ? fromHex(said.r) : null;
    if (!r || !(await verifyCoin(next.id, r, toss.c))) return invalid();
    toss.r = said.r;
    game.first = (await coinToss(next.id, r, fromHex(toss.s))) === 0 ? game.a : game.b;
  }
}

/**
 * Brings what the other phone has of a match (`theirs`, its `game`) into mine. `from` is who said
 * it. With no record yet, it is an invitation: joined if it is the starter's own and nobody has
 * taken the other seat (`me`, `g`, `gv`, `id` make the new record).
 *
 * `verdict`: `took` (something of theirs was taken), `same`, `ahead` (they lack some of mine),
 * `fork` (we parted ways: both kept, the user picks), `bad` (it breaks the rules or adds moves for
 * me: nothing taken), `stranger` (not from the other participant of this match).
 */
export async function merge(record, theirs, rules, { from, me, g, gv, id, now = Date.now() } = {}) {
  if (!theirs || typeof theirs !== "object") return { record, verdict: "bad", changed: false };
  if (!record) {
    if (theirs.a !== from || !isId(from) || (theirs.b !== null && theirs.b !== undefined)) return { record, verdict: "stranger", changed: false };
    const joined = newMatch({ g, gv, id, me, now });
    joined.game.a = from;
    joined.game.b = me;
    return { record: joined, verdict: "took", changed: true };
  }
  if (theirs.a !== record.game.a) return { record, verdict: "stranger", changed: false };
  const next = structuredClone(record);
  const game = next.game;
  let changed = false;
  if (!game.b && next.me === game.a && isId(from) && from !== next.me && theirs.b === from) {
    game.b = from;
    changed = true;
  }
  const peer = peerOf(next);
  if (!peer || from !== peer) return { record, verdict: "stranger", changed: false };

  const before = JSON.stringify(game);
  if (!game.end && validEnd(theirs.end, game)) game.end = { k: theirs.end.k, by: theirs.end.by };
  if (!game.end && !game.first) await mergeToss(next, theirs.toss);
  changed ||= JSON.stringify(game) !== before;

  let verdict = changed ? "took" : "same";
  const mine = game.moves;
  const told = Array.isArray(theirs.moves) ? theirs.moves : [];
  if (game.first && told.length) {
    const played = replay({ ...game, moves: told }, rules);
    if (!played.ok) return { record, verdict: "bad", changed: false };
    let common = 0;
    while (common < mine.length && common < told.length && same(mine[common], told[common])) common += 1;
    // Whatever they have beyond what we share must be theirs: never a move made for me.
    if (played.actors.slice(common).includes(next.me)) return { record, verdict: "bad", changed: false };
    if (common === mine.length && common < told.length) {
      game.moves = structuredClone(told);
      next.heard = told.length;
      next.fork = null;
      verdict = "took";
      changed = true;
    } else if (common === told.length) {
      next.heard = Math.max(next.heard, told.length);
      if (common < mine.length) verdict = changed ? "took" : "ahead";
    } else {
      next.fork = structuredClone(told);
      next.heard = Math.max(next.heard, common);
      verdict = "fork";
    }
  } else if (game.first && !told.length && mine.length) {
    verdict = changed ? "took" : "ahead";
  }
  // Once their copy agrees with mine again, the other way is gone.
  if (verdict !== "fork") next.fork = null;
  if (changed) next.updated = now;
  return { record: next, verdict, changed };
}

/** Picks which copy of a forked match goes on: `mine` or `theirs`. */
export function chooseFork(record, which, now = Date.now()) {
  const next = structuredClone(record);
  if (which === "theirs" && next.fork) next.game.moves = next.fork;
  next.fork = null;
  next.updated = now;
  return next;
}

/** Everything the screens need to know about a match, worked out from the record. */
export function view(record, rules) {
  const { game, me } = record;
  const played = replay(game, rules);
  const rounds = played.ok ? played.rounds : [];
  const round = rounds.at(-1) ?? null;
  const other = (who) => (who === game.a ? game.b : game.a);
  let phase = "play";
  if (!game.b) phase = "invite";
  else if (game.end) phase = "ended";
  else if (!game.first) phase = "toss";
  else if (!played.ok) phase = "broken";
  else if (round.end) phase = "over";
  let turn = null;
  if (phase === "play") turn = rules.turn(round.state) === 0 ? round.starter : other(round.starter);
  const actors = played.ok ? played.actors : [];
  let pending = 0;
  for (let at = record.heard; at < actors.length; at += 1) if (actors[at] === me) pending += 1;
  return {
    phase,
    me,
    peer: peerOf(record),
    rounds,
    round,
    index: Math.max(0, rounds.length - 1),
    turn,
    myTurn: turn !== null && turn === me,
    mySide: round ? (round.starter === me ? 0 : 1) : null,
    state: round?.state ?? rules.initial(),
    last: round?.moves.at(-1) ?? null,
    pending,
    result: round?.end ?? null,
    score: score({ rounds }, me),
    fork: Boolean(record.fork),
    end: game.end,
  };
}
