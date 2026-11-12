// Nothing received is trusted. A match is replayed through the rules from the first move, the coin is
// checked against its commitment, and a phone may only add moves for its own side.

import { coinCommit, coinToss, fromHex, hex, randomBytes, verifyCoin } from "./commit.js";
import { isId } from "./envelope.js";

export const PREFIX = "game/";
export const RECORD = 1;

const HEX64 = /^[0-9a-f]{64}$/;
const isHex64 = (value) => typeof value === "string" && HEX64.test(value);
const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function newId() {
  return Array.from(randomBytes(16), (byte) => ALPHABET[byte % 36]).join("");
}

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

export function peerOf(record) {
  const { a, b } = record.game;
  return (record.me === a ? b : a) ?? null;
}

// JSON bytes, under the core's 48 KiB per message
export const MATCH_LIMIT = 40_000;
export const MOVE_LENGTH = 64;

/** Rebuilt with nothing else in it, since extra fields would travel and be kept for ever. */
export function eventOf(value) {
  if (typeof value === "string") return value.length > 0 && value.length <= MOVE_LENGTH ? value : null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const keys = Object.keys(value).sort().join(",");
  if (value.x === "next" && keys === "x") return { x: "next" };
  if (value.x === "resign" && keys === "by,x" && isId(value.by)) return { x: "resign", by: value.by };
  return null;
}

export function isEvent(value) {
  return eventOf(value) !== null;
}

const same = (one, two) => JSON.stringify(eventOf(one)) === JSON.stringify(eventOf(two));

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

/** The starter commits, the other sends its seed only after the commitment, the starter reveals once
 *  the seed is in. Each step is saved before it is said. */
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

async function mergeToss(next, theirs) {
  const { game, me } = next;
  const toss = game.toss;
  const said = theirs && typeof theirs === "object" ? theirs : {};
  const invalid = () => {
    game.end = { k: "invalid", by: game.a };
  };
  if (me === game.a) {
    if (toss.c && !toss.s && isHex64(said.s)) toss.s = said.s;
    return;
  }
  if (isHex64(said.c) && toss.c && said.c !== toss.c) return invalid();
  if (!toss.c && !toss.s && isHex64(said.c)) toss.c = said.c;
  if (toss.c && toss.s && !toss.r && isHex64(said.r)) {
    const r = fromHex(said.r);
    if (!(await verifyCoin(next.id, r, toss.c))) return invalid();
    toss.r = said.r;
    game.first = (await coinToss(next.id, r, fromHex(toss.s))) === 0 ? game.a : game.b;
  }
}

export async function merge(record, theirs, rules, { from, me, g, gv, id, refused = false, now = Date.now() } = {}) {
  if (record) {
    // who speaks is checked first, nothing is weighed for anyone but the other participant
    const joining = !record.game.b && record.me === record.game.a && isId(from) && from !== record.me;
    if (!joining && from !== peerOf(record)) return { record, verdict: "stranger", changed: false };
  }
  if (!theirs || typeof theirs !== "object" || Array.isArray(theirs)) return { record, verdict: "bad", changed: false };
  if (new TextEncoder().encode(JSON.stringify(theirs)).length > MATCH_LIMIT) return { record, verdict: "bad", changed: false };
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
  // An end from the wire is only taken as the kit makes it, b abandons when a's reveal misses 30 s
  // after the seed. Once the coin has spoken nobody can void the match.
  const ended = theirs.end;
  if (!game.end && !game.first && next.me === game.a && ended?.k === "abandoned" && ended.by === game.a) game.end = { k: "abandoned", by: game.a };
  // a late reveal that checks out still settles the coin, a gains nothing by it
  const gaveUp = next.me === game.b && game.end?.k === "abandoned" && !game.first;
  if ((!game.end || gaveUp) && !game.first) await mergeToss(next, theirs.toss);
  if (gaveUp && game.first) game.end = null;
  changed ||= JSON.stringify(game) !== before;

  let verdict = changed ? "took" : "same";
  const mine = game.moves;
  const moves = Array.isArray(theirs.moves) ? theirs.moves.map(eventOf) : [];
  if (moves.includes(null)) return { record, verdict: "bad", changed: false };
  if (game.first && moves.length) {
    const played = replay({ ...game, moves }, rules);
    if (!played.ok) return { record, verdict: "bad", changed: false };
    let common = 0;
    while (common < mine.length && common < moves.length && same(mine[common], moves[common])) common += 1;
    // whatever they have beyond what we share must be theirs, never a move made for me
    if (played.actors.slice(common).includes(next.me)) return { record, verdict: "bad", changed: false };
    if (common === mine.length && common < moves.length) {
      game.moves = structuredClone(moves);
      next.heard = moves.length;
      next.fork = null;
      verdict = "took";
      changed = true;
    } else if (common === moves.length) {
      next.heard = Math.max(next.heard, moves.length);
      if (common < mine.length) verdict = changed ? "took" : "ahead";
      if (common < mine.length && refused) {
        next.fork = structuredClone(moves);
        verdict = "fork";
      }
    } else {
      next.fork = structuredClone(moves);
      next.heard = Math.max(next.heard, common);
      verdict = "fork";
    }
  } else if (game.first && !moves.length && mine.length) {
    verdict = changed ? "took" : "ahead";
    if (refused) {
      next.fork = [];
      verdict = "fork";
    }
  }
  if (verdict === "same" && next.me === game.a && game.toss.r && theirs.toss?.r !== game.toss.r) verdict = "ahead";
  if (verdict !== "fork") next.fork = null;
  if (changed) next.updated = now;
  return { record: next, verdict, changed };
}

export function chooseFork(record, which, now = Date.now()) {
  const next = structuredClone(record);
  if (which === "theirs" && next.fork) next.game.moves = next.fork;
  next.fork = null;
  next.updated = now;
  return next;
}

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
