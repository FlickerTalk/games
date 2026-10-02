// The table: one phone's side of the games, between the user, the kept matches and the twin on
// the other phone (README, "Protocol"). Two tables are wired here as two phones in one
// conversation, with the toy game, and every rule of the live channel is played through.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KV, PROTOCOL, fromBase64, seal } from "../src/envelope.js";
import { newMatch, peerOf } from "../src/match.js";
import { summarize, Table } from "../src/table.js";
import { fakeCore, phones, settle as settleAll, toy } from "./helpers.js";

const kinds = (core) => core.sent.map((data) => JSON.parse(new TextDecoder().decode(fromBase64(data))).k);
const said = (core, at = -1) => JSON.parse(new TextDecoder().decode(fromBase64(core.sent.at(at))));
const t = (key, vars = {}) => (key === "name" ? "Toy" : `${key}${Object.keys(vars).length ? JSON.stringify(vars) : ""}`);

/** A table on a fake core, opened as the app opens it. */
async function table(core, opening = {}, options = {}) {
  const one = new Table({ ft: core.ft, game: toy, app: "1.0.0", t, ...options });
  one.core = core;
  await core.open(opening);
  await one.idle();
  return one;
}

/** Lets every message in flight land, and every answer to it. */
const settle = (...tables) => settleAll(tables);

/** Two phones with the plugin open in one conversation, a match started by A and the coin tossed. */
async function started() {
  const { a, b } = phones();
  const ta = await table(a);
  const tb = await table(b);
  await ta.newMatch();
  await settle(ta, tb);
  return { a, b, ta, tb, first: ta.view.turn === ta.record.me ? ta : tb, second: ta.view.turn === ta.record.me ? tb : ta };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("opening and starting", () => {
  it("says nothing when the plugin opens, and lists what this phone keeps", async () => {
    const core = fakeCore();
    const one = await table(core);
    expect(core.sent).toEqual([]);
    expect(one.screen).toBe("list");
    expect(one.matches).toEqual([]);
    expect(one.live).toBe(true);
  });

  it("starts a match only from a conversation, keeps it at once, then says hello", async () => {
    const core = fakeCore();
    const away = await table(core, { live: false });
    await away.newMatch();
    expect(away.screen).toBe("list");
    expect(away.notice).toEqual({ key: "needsChat" });
    expect(core.records.size).toBe(0);

    const one = await table(fakeCore());
    await one.newMatch();
    expect(one.screen).toBe("match");
    expect(one.view.phase).toBe("invite");
    expect(JSON.parse(one.core.records.get(`game/${one.core.chat}/${one.record.id}`))).toEqual(one.record);
    const sent = said(one.core);
    expect(sent).toMatchObject({ p: PROTOCOL, kv: KV, g: "toy", gv: 1, k: "hello", doc: one.record.id, who: one.record.me, app: "1.0.0" });
    expect(sent.game).toEqual(one.record.game);
  });
});

describe("two phones", () => {
  it("join a match when the other phone is open on its list, and toss the coin in three messages", async () => {
    const { a, b, ta, tb } = await started();
    expect(tb.screen).toBe("match");
    expect(tb.record.id).toBe(ta.record.id);
    expect(kinds(a)).toEqual(["hello", "commit", "reveal"]);
    expect(kinds(b)).toEqual(["sync", "seed", "sync"]);
    expect(ta.record.game).toEqual(tb.record.game);
    expect(ta.view.phase).toBe("play");
    expect([ta.view.myTurn, tb.view.myTurn].sort()).toEqual([false, true]);
    expect(ta.peerHere && tb.peerHere).toBe(true);
    // Saved on both phones, as it is.
    expect(JSON.parse(a.records.get(`game/${a.chat}/${ta.record.id}`))).toEqual(ta.record);
    expect(JSON.parse(b.records.get(`game/${b.chat}/${tb.record.id}`))).toEqual(tb.record);
  });

  it("play a move: the other side replays it through the rules and acknowledges it", async () => {
    const { first, second } = await started();
    await first.play("p");
    expect(first.view.pending).toBe(1);
    await settle(first, second);
    expect(second.record.game.moves).toEqual(["p"]);
    expect(second.view.myTurn).toBe(true);
    expect(first.view.pending).toBe(0);
    // Not my turn: nothing happens.
    await first.play("p");
    expect(first.record.game.moves).toEqual(["p"]);
  });

  it("say honestly that the other person does not have the game open, after 8 s without an answer", async () => {
    const { a, b } = phones();
    b.closed = true;
    const ta = await table(a);
    await ta.newMatch();
    await vi.advanceTimersByTimeAsync(7_900);
    expect(ta.notice).toBeNull();
    await vi.advanceTimersByTimeAsync(200);
    expect(ta.notice).toEqual({ key: "notOpen" });
    expect(ta.peerHere).toBe(false);
  });

  it("keep a move pending when it cannot go out, and send it with the next hello", async () => {
    const { first, second } = await started();
    const id = first.record.id;
    const core = first.core;
    core.reachable = false;
    await first.play("p");
    await settle(first, second);
    expect(first.notice).toEqual({ key: "unreachable" });
    expect(first.view.pending).toBe(1);
    expect(second.record.game.moves).toEqual([]);
    core.reachable = true;
    await first.leave();
    await first.enter(id);
    await settle(first, second);
    expect(second.record.game.moves).toEqual(["p"]);
    expect(first.view.pending).toBe(0);
    expect(first.notice).toBeNull();
  });

  it("answer a copy that lacks some of their moves with what they have", async () => {
    const { first, second } = await started();
    first.core.reachable = false;
    await first.play("p");
    await settle(first, second);
    first.core.reachable = true;
    const before = first.core.sent.length;
    // The other phone's own copy arrives, without the move.
    await first.core.hear(seal({ p: PROTOCOL, kv: KV, g: "toy", gv: 1, k: "sync", doc: second.record.id, who: second.record.me, app: "1.0.0", game: second.record.game }));
    await settle(first, second);
    expect(kinds(first.core).slice(before)).toEqual(["sync"]);
    expect(second.record.game.moves).toEqual(["p"]);
    expect(first.view.pending).toBe(0);
  });

  it("go on by themselves when the side that closed opens the game again", async () => {
    const { first, second } = await started();
    const id = first.record.id;
    second.core.closed = true;
    await first.play("p");
    await settle(first);
    await vi.advanceTimersByTimeAsync(8_100);
    expect(first.notice).toEqual({ key: "notOpen" });
    expect(first.view.pending).toBe(1);

    // The other phone opens the plugin again, on its list: the same records, a new frame.
    const back = fakeCore({ records: second.core.records });
    back.wire = second.core.wire;
    first.core.wire = (data) => setTimeout(() => back.hear(data), 0);
    const again = await table(back);
    expect(again.screen).toBe("list");
    expect(back.sent).toEqual([]);
    // The waiting side says hello again on its own, and the match opens there with the move in it.
    await vi.advanceTimersByTimeAsync(15_000);
    await settle(first, again);
    expect(again.screen).toBe("match");
    expect(again.record.id).toBe(id);
    expect(again.record.game.moves).toEqual(["p"]);
    expect(first.view.pending).toBe(0);
    expect(first.notice).toBeNull();
  });

  it("stop saying hello on their own after a few tries", async () => {
    const { a, b } = phones();
    b.closed = true;
    const ta = await table(a);
    await ta.newMatch();
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    const hellos = kinds(a).filter((kind) => kind === "hello").length;
    expect(hellos).toBeGreaterThan(1);
    expect(hellos).toBeLessThanOrEqual(9);
  });

  it("say hello with the whole match when the user enters it, and the other answers with its own", async () => {
    const { a, b, ta, tb, first } = await started();
    await first.play("p");
    await settle(ta, tb);
    await ta.leave();
    await settle(ta, tb);
    const [fromA, fromB] = [a.sent.length, b.sent.length];
    await ta.enter(tb.record.id);
    await settle(ta, tb);
    const hello = sentBy(a)[fromA];
    expect(hello).toMatchObject({ k: "hello", who: ta.record.me, game: ta.record.game });
    expect(hello).not.toHaveProperty("proof");
    expect(kinds(a).slice(fromA)).toEqual(["hello"]);
    expect(kinds(b).slice(fromB)).toEqual(["sync"]);
    expect(ta.peerHere).toBe(true);
  });

  it("say goodbye when the user leaves the match", async () => {
    const { first, second } = await started();
    await first.leave();
    await settle(first, second);
    expect(second.notice).toEqual({ key: "left" });
    expect(second.peerHere).toBe(false);
    expect(first.screen).toBe("list");
    expect(first.matches).toHaveLength(1);
  });
});

describe("what the other phone says, checked", () => {
  it("is not applied when its protocol or its rules are newer, and the user is told to update", async () => {
    const { ta, tb, b } = await started();
    const before = structuredClone(tb.record);
    await b.hear(seal({ p: PROTOCOL, kv: KV + 1, g: "toy", gv: 1, k: "state", doc: tb.record.id, who: ta.record.me, app: "2.0.0", game: {} }));
    await tb.idle();
    expect(tb.notice).toEqual({ key: "update", vars: { version: "2.0.0" } });
    expect(tb.record).toEqual(before);
  });

  it("is ignored when it is not ours or of a kind we do not know", async () => {
    const { ta, tb, b } = await started();
    const before = structuredClone(tb.record);
    const sent = b.sent.length;
    await b.hear("garbage");
    await b.hear(seal({ p: PROTOCOL, kv: KV, g: "toy", gv: 1, k: "dance", doc: tb.record.id, who: ta.record.me }));
    await tb.idle();
    expect(tb.record).toEqual(before);
    expect(b.sent.length).toBe(sent);
  });

  it("is refused when a move breaks the rules", async () => {
    const { first, second } = await started();
    const forged = { ...first.record.game, moves: ["x"] };
    await second.core.hear(seal({ p: PROTOCOL, kv: KV, g: "toy", gv: 1, k: "state", doc: first.record.id, who: first.record.me, app: "1.0.0", game: forged }));
    await second.idle();
    expect(second.notice).toEqual({ key: "badMove" });
    expect(second.record.game.moves).toEqual([]);
  });

  it("makes the match invalid when the coin's reveal does not match its commitment", async () => {
    const { a, b } = phones();
    const forward = a.wire;
    a.wire = (data) => {
      const message = JSON.parse(new TextDecoder().decode(fromBase64(data)));
      if (message.k === "reveal") message.game.toss.r = "00".repeat(32);
      forward(seal(message));
    };
    const ta = await table(a);
    const tb = await table(b);
    await ta.newMatch();
    await settle(ta, tb);
    expect(tb.record.game.end).toEqual({ k: "invalid", by: ta.record.me });
    expect(tb.view.phase).toBe("ended");
    // a's phone revealed: nobody can void the match on it once the coin has spoken (C2).
    expect(ta.view.phase).not.toBe("ended");
  });

  it("gives the match up as abandoned when the reveal does not come within 30 s", async () => {
    const { a, b } = phones();
    // A phone that saw the seed and does not like the coin: it never reveals, in any message.
    const forward = a.wire;
    a.wire = (data) => {
      const message = JSON.parse(new TextDecoder().decode(fromBase64(data)));
      if (message.k === "reveal") return;
      if (message.game?.toss) delete message.game.toss.r;
      forward(seal(message));
    };
    const ta = await table(a);
    const tb = await table(b);
    await ta.newMatch();
    await settle(ta, tb);
    expect(tb.view.phase).toBe("toss");
    await vi.advanceTimersByTimeAsync(29_000);
    expect(tb.view.phase).toBe("toss");
    await vi.advanceTimersByTimeAsync(1_100);
    await settle(ta, tb);
    expect(tb.record.game.end).toEqual({ k: "abandoned", by: ta.record.me });
    expect(tb.notice).toEqual({ key: "abandoned" });
    // a's phone revealed (only the wire hid it): b's word cannot void the match there (C2).
    expect(ta.view.phase).not.toBe("ended");
  });
});

describe("two phones that disagree on a move", () => {
  it("say so once each, show it honestly on both sides, and go on with the copy the user picks", async () => {
    const { first, second } = await started();
    // A's copy holds a move for B's seat that B never made (a bug, or a tampered phone).
    const wrong = structuredClone(first.record);
    wrong.game.moves = ["p", "w"];
    first.record = wrong;
    await first.core.ft.records.set(`game/${first.core.chat}/${wrong.id}`, JSON.stringify(wrong));
    const [fromA, fromB] = [first.core.sent.length, second.core.sent.length];
    await first.retry();
    for (let round = 0; round < 6; round += 1) await settle(first, second);
    const exchanged = first.core.sent.length - fromA + (second.core.sent.length - fromB);
    expect(exchanged).toBeLessThanOrEqual(4);
    expect(second.notice).toEqual({ key: "badMove" });
    expect(second.record.game.moves).toEqual([]);
    expect(first.view.fork).toBe(true);
    expect(first.notice).toEqual({ key: "fork" });
    await first.pickFork("theirs");
    await settle(first, second);
    expect(first.record.game.moves).toEqual([]);
    expect(first.view.fork).toBe(false);
  });
});

describe("the coin over a channel that dropped", () => {
  it("gives the match up after 30 s without saying anything over a channel that took nothing", async () => {
    const { a, b } = phones();
    const forward = a.wire;
    let down = false;
    a.wire = (data) => {
      // The connection drops just as the commitment arrives: nothing goes either way after it.
      if (down) return;
      if (JSON.parse(new TextDecoder().decode(fromBase64(data))).k === "commit") {
        down = true;
        b.reachable = false;
      }
      forward(data);
    };
    const ta = await table(a);
    const tb = await table(b);
    await ta.newMatch();
    await settle(ta, tb);
    expect(kinds(b)).toEqual(["sync", "seed"]);
    await vi.advanceTimersByTimeAsync(30_100);
    await settle(ta, tb);
    expect(tb.record.game.end).toEqual({ k: "abandoned", by: ta.record.me });
    expect(JSON.parse(b.records.get(`game/${b.chat}/${tb.record.id}`)).game.end).toEqual({ k: "abandoned", by: ta.record.me });
    // Without a channel that took the last message, a word now would wake the other phone.
    expect(kinds(b)).toEqual(["sync", "seed"]);
  });
});

describe("a match this kit cannot read", () => {
  it("is never joined over, nor opened, by an invitation naming it", async () => {
    const core = fakeCore();
    const kept = JSON.stringify({ v: 2, id: "m1", g: "toy", what: "a newer kit's match" });
    core.records.set(`game/${core.chat}/m1`, kept);
    const one = await table(core);
    const invitation = { a: "wa", b: null, first: null, toss: {}, moves: [], end: null };
    await core.hear(seal({ p: PROTOCOL, kv: KV, g: "toy", gv: 1, k: "hello", doc: "m1", who: "wa", app: "1.0.0", game: invitation }));
    await one.idle();
    expect(core.records.get(`game/${core.chat}/m1`)).toBe(kept);
    expect(one.screen).toBe("list");
    expect(core.sent.map((data) => JSON.parse(new TextDecoder().decode(fromBase64(data)))).filter((message) => message.game)).toEqual([]);
  });
});

describe("a phone busy elsewhere", () => {
  it("asks its user to join a new match, and tells the other side", async () => {
    const { ta, tb } = await started();
    const old = ta.record.id;
    await ta.leave();
    await ta.newMatch();
    await settle(ta, tb);
    expect(tb.record.id).toBe(old);
    expect(tb.prompt).toMatchObject({ kind: "invited", id: ta.record.id });
    expect(ta.notice).toEqual({ key: "busy" });
    await tb.accept();
    await settle(ta, tb);
    expect(tb.record.id).toBe(ta.record.id);
    expect(tb.prompt).toBeNull();
    expect(tb.view.phase).toBe("play");
    expect(ta.notice).toBeNull();
  });

  it("can be left alone", async () => {
    const { ta, tb } = await started();
    await ta.leave();
    await ta.newMatch();
    await settle(ta, tb);
    tb.dismiss();
    expect(tb.prompt).toBeNull();
    expect(tb.matches.map((one) => one.record.id)).not.toContain(ta.record.id);
  });
});

describe("the end of a round", () => {
  it("comes with a resignation, then another round, and the result goes to the chat in the sender's words", async () => {
    const { first, second } = await started();
    await second.resign();
    await settle(first, second);
    expect(first.view.phase).toBe("over");
    expect(first.view.result).toMatchObject({ k: "resign", winner: first.record.me });
    expect(first.view.score).toEqual({ me: 1, them: 0, draws: 0 });
    // The new round starts with the other side.
    await first.again();
    await settle(first, second);
    expect(second.view).toMatchObject({ phase: "play", myTurn: true, index: 1 });
    await second.play("d");
    await settle(first, second);
    expect(first.view.score).toEqual({ me: 1, them: 0, draws: 1 });
    first.sendResult();
    expect(first.ft.say).toHaveBeenCalledWith(summarize(first.view, { t, icon: "🧸", name: "Toy", lang: "en" }));
    expect(first.core.said.at(-1)).toBe("🧸 say{\"game\":\"Toy\",\"result\":\"sayDraw\",\"score\":\"1–0\"} · sayDraws{\"n\":\"1\"}");
  });

  it("is summed up with numbers in the sender's language", () => {
    const view = { result: { winner: "me" }, me: "me", score: { me: 12, them: 3, draws: 0 } };
    expect(summarize(view, { t, icon: "⭕", name: "Tic-Tac-Toe", lang: "bn" })).toBe(`⭕ say{"game":"Tic-Tac-Toe","result":"sayIWon","score":"১২–৩"}`);
    expect(summarize({ ...view, result: { winner: "you" } }, { t, icon: "⭕", name: "X", lang: "en" })).toContain("sayYouWon");
  });

  it("is not saved, nor sent, when the phone has no room left", async () => {
    const { first, second } = await started();
    first.ft.records.set.mockImplementation(async () => false);
    await first.play("p");
    expect(first.notice).toEqual({ key: "full" });
    expect(first.record.game.moves).toEqual([]);
    await settle(first, second);
    expect(second.record.game.moves).toEqual([]);
  });

  it("stops a series that would not fit in one message", async () => {
    const { first, second } = await started();
    // A long series, each round a draw in one move, the starter taking turns.
    const rounds = [];
    for (let round = 0; round < 2400; round += 1) rounds.push("d", { x: "next" });
    rounds.length -= 1;
    first.record.game.moves = rounds;
    expect(first.view.phase).toBe("over");
    await first.again();
    expect(first.notice).toEqual({ key: "tooLong" });
    expect(first.record.game.moves).toHaveLength(rounds.length);
    expect(second.record.game.moves).toEqual([]);
  });
});

describe("matches on this phone", () => {
  it("are deleted, and a divergent one goes on with the copy the user picks", async () => {
    const { first, second } = await started();
    const id = first.record.id;
    // Each phone believes something else happened at move 1: wb's move against wa resigning.
    await first.play("p");
    await settle(first, second);
    second.core.reachable = false;
    first.core.reachable = false;
    await second.play("p");
    await first.resign();
    first.core.reachable = true;
    second.core.reachable = true;
    await first.retry();
    await settle(first, second);
    expect(first.view.fork).toBe(true);
    expect(first.notice).toEqual({ key: "fork" });
    await first.pickFork("theirs");
    await settle(first, second);
    expect(first.record.game.moves).toEqual(second.record.game.moves);
    expect(first.view.fork).toBe(false);
    expect(second.view.fork).toBe(false);

    await first.leave();
    await first.remove(id);
    expect(first.matches).toEqual([]);
    expect(first.core.records.size).toBe(0);
  });
});

/** Everything a fake core sent, read back. */
const sentBy = (core) => core.sent.map((data) => JSON.parse(new TextDecoder().decode(fromBase64(data))));
/** Two fake cores wired as one conversation. */
const wire = (one, two) => {
  one.wire = (data) => !two.closed && setTimeout(() => two.hear(data), 0);
  two.wire = (data) => !one.closed && setTimeout(() => one.hear(data), 0);
};
const message = (fields) => seal({ p: PROTOCOL, kv: KV, g: "toy", gv: 1, app: "1.0.0", ...fields });
/** What was said, with every random id and hex value written the same way. */
const plain = (list) => JSON.stringify(list).replace(/[0-9a-f]{64}/g, "HEX").replace(/[a-z0-9]{16}/g, "ID");

/**
 * A plays a match X with C; B is another contact of A. A's user opens the game in B's chat: a new
 * frame over the same records, in the conversation with B. Returns A's phone in B's chat (`ab`,
 * its table `tab`), B's phone (`b`, `tb`), and match X as A keeps it in the conversation with C.
 */
async function aMatchWithCAndAFrameInBsChat({ records } = {}) {
  const { first, second } = await started();
  const [ta, tc] = [second, first];
  await tc.play("p");
  await settle(ta, tc);
  const x = structuredClone(ta.record);
  await ta.leave();
  await settle(ta, tc);
  ta.core.closed = true;
  ta.core.wire = () => {};
  ta.stopTimers();
  const ab = fakeCore({ records: records ?? ta.core.records, chat: "a-with-b" });
  const b = fakeCore({ chat: "b-with-a" });
  wire(ab, b);
  const tab = await table(ab);
  const tb = await table(b);
  return { ta, tc, x, ac: ta.core, ab, tab, b, tb, ids: [x.me, peerOf(x)] };
}

describe("a match belongs to its conversation", () => {
  it("is listed, and can be entered, only in its own conversation", async () => {
    const { x, ac, ab, tab, tb } = await aMatchWithCAndAFrameInBsChat();
    expect(tab.matches).toEqual([]);
    await tab.enter(x.id);
    await settle(tab, tb);
    expect(tab.screen).toBe("list");
    expect(ab.sent).toEqual([]);
    // A match with B is kept in the conversation with B, and shown only there.
    await tab.newMatch();
    await settle(tab, tb);
    const withB = tab.record.id;
    await tab.leave();
    expect(tab.matches.map((one) => one.record.id)).toEqual([withB]);
    const again = await table(fakeCore({ records: ac.records, chat: ac.chat }));
    expect(again.matches.map((one) => one.record.id)).toEqual([x.id]);
  });

  it("shows and starts nothing outside a conversation", async () => {
    const { ac } = await aMatchWithCAndAFrameInBsChat();
    const keys = [...ac.records.keys()];
    const away = await table(fakeCore({ records: ac.records }), { chat: undefined });
    expect(away.matches).toEqual([]);
    await away.newMatch();
    expect(away.notice).toEqual({ key: "needsChat" });
    expect(away.screen).toBe("list");
    expect([...ac.records.keys()]).toEqual(keys);
    const odd = await table(fakeCore({ records: ac.records }), { chat: "not/a/chat" });
    expect(odd.matches).toEqual([]);
  });

  it("answers another contact that names it exactly as for a match that does not exist", async () => {
    // The same phone twice, so each probe meets the same state.
    const first = await aMatchWithCAndAFrameInBsChat();
    const { x, ac } = first;
    const kept = ac.records.get(`game/${ac.chat}/${x.id}`);
    const probe = async (doc) => {
      const copy = new Map(ac.records);
      const ab = fakeCore({ records: copy, chat: "a-with-b" });
      const b = fakeCore({ chat: "b-with-a" });
      wire(ab, b);
      const tab = await table(ab);
      for (const fields of [
        { k: "state", who: x.game.b, game: { ...x.game, moves: [...x.game.moves, "p"] } },
        { k: "sync", who: x.game.b, game: x.game },
        { k: "commit", who: x.game.b, game: x.game },
        { k: "bye", who: x.game.b },
        { k: "busy", who: x.game.b },
        { k: "hello", who: x.game.b, game: { ...x.game } },
        { k: "hello", who: "zz", game: 0 },
        { k: "hello", who: "bbbbbbbbbbbbbbbb", game: { a: "bbbbbbbbbbbbbbbb", b: null, first: null, toss: {}, moves: [], end: null } },
      ]) {
        await ab.hear(message({ doc, ...fields }));
        await settle(tab);
      }
      await settle(tab);
      return { said: plain(sentBy(ab)).split(doc).join("DOC"), copy, tab };
    };
    const known = await probe(x.id);
    const unknown = await probe("nosuchmatch00001");
    expect(known.said).toBe(unknown.said);
    // X with C is untouched; the invitation made a match of its own, in the conversation with B.
    expect(known.copy.get(`game/${ac.chat}/${x.id}`)).toBe(kept);
    expect(known.tab.record.id).toBe(x.id);
    expect(known.tab.record.game.a).toBe("bbbbbbbbbbbbbbbb");
    expect(JSON.stringify(sentBy(first.ab))).not.toContain(x.game.a);
  });

  it("is deleted in its own conversation only, even when another has a match with the same id", async () => {
    const { x, ac, ab, tab, b } = await aMatchWithCAndAFrameInBsChat();
    await ab.hear(message({ k: "hello", doc: x.id, who: "bbbbbbbbbbbbbbbb", game: { a: "bbbbbbbbbbbbbbbb", b: null, first: null, toss: {}, moves: [], end: null } }));
    await settle(tab);
    expect(ab.records.has(`game/a-with-b/${x.id}`)).toBe(true);
    await tab.leave();
    await tab.remove(x.id);
    expect(ab.records.has(`game/a-with-b/${x.id}`)).toBe(false);
    expect(ac.records.has(`game/${ac.chat}/${x.id}`)).toBe(true);
    void b;
  });

  it("never says which conversation it is in", async () => {
    const { a, b, ta, tb, first } = await started();
    await first.play("p");
    await settle(ta, tb);
    await ta.leave();
    await ta.enter(tb.record.id);
    await settle(ta, tb);
    await ta.resign();
    await settle(ta, tb);
    for (const core of [a, b]) {
      const all = JSON.stringify(sentBy(core));
      for (const chat of [a.chat, b.chat]) expect(all).not.toContain(chat);
      for (const one of sentBy(core)) expect(one).not.toHaveProperty("chat");
    }
  });
});

describe("each path the reviews flagged, with every match in its conversation", () => {
  it("opens on a hello only a match of this conversation: one of another conversation is unknown here", async () => {
    const { x, ac, ab, tab } = await aMatchWithCAndAFrameInBsChat();
    const kept = ac.records.get(`game/${ac.chat}/${x.id}`);
    await ab.hear(message({ k: "hello", doc: x.id, who: x.game.b, game: { ...x.game, moves: [...x.game.moves, "p"] } }));
    await settle(tab);
    expect(tab.screen).toBe("list");
    expect(sentBy(ab).map((one) => one.k)).toEqual(["deny"]);
    expect(ac.records.get(`game/${ac.chat}/${x.id}`)).toBe(kept);
  });

  it("keeps a match id that two conversations share apart in everything it does", async () => {
    const { x, ac, ab, tab, b, tb } = await aMatchWithCAndAFrameInBsChat();
    const kept = ac.records.get(`game/${ac.chat}/${x.id}`);
    // B's phone invites A to a match whose id happens to be X's.
    const inviting = newMatch({ g: "toy", gv: 1, id: x.id });
    await b.ft.records.set(`game/${b.chat}/${x.id}`, JSON.stringify(inviting));
    await tb.enter(x.id);
    await settle(tab, tb);
    expect(tab.record.id).toBe(x.id);
    expect(tab.view.phase).toBe("play");
    const mine = tab.view.myTurn ? tab : tb;
    await mine.play("p");
    await settle(tab, tb);
    expect(JSON.parse(ab.records.get(`game/a-with-b/${x.id}`)).game.moves).toEqual(["p"]);
    expect(ac.records.get(`game/${ac.chat}/${x.id}`)).toBe(kept);
    await tab.leave();
    expect(tab.matches.map((one) => one.record.game.a)).toEqual([inviting.me]);
  });

  it("answers another contact probing for a match of another conversation as for an unknown one, busy or not", async () => {
    const { x, ac } = await aMatchWithCAndAFrameInBsChat();
    const probe = async (doc) => {
      const ab = fakeCore({ records: new Map(ac.records), chat: "a-with-b" });
      const b = fakeCore({ chat: "b-with-a" });
      wire(ab, b);
      const tab = await table(ab);
      await tab.newMatch();
      await settle(tab);
      const before = ab.sent.length;
      for (const k of ["state", "sync", "hello"]) await ab.hear(message({ k, doc, who: x.game.b, game: x.game }));
      await ab.hear(message({ k: "hello", doc, who: "bbbbbbbbbbbbbbbb", game: { a: "bbbbbbbbbbbbbbbb", b: null, first: null, toss: {}, moves: [], end: null } }));
      await settle(tab);
      return { said: plain(sentBy(ab).slice(before)).split(doc).join("DOC"), tab };
    };
    const known = await probe(x.id);
    const unknown = await probe("nosuchmatch00001");
    expect(known.said).toBe(unknown.said);
    expect(known.tab.prompt).toMatchObject({ kind: "invited" });
    expect(JSON.parse(known.said).map((one) => one.k)).toEqual(["deny", "busy"]);
  });

  it("recovers a lost join answer: the joiner answers the invitation again", async () => {
    const { a, b } = phones();
    // The first answer of the one who joins is lost on the way.
    const forward = b.wire;
    let lost = false;
    b.wire = (data) => {
      if (!lost && JSON.parse(new TextDecoder().decode(fromBase64(data))).k === "sync") {
        lost = true;
        return;
      }
      forward(data);
    };
    const ta = await table(a);
    const tb = await table(b);
    await ta.newMatch();
    await settle(ta, tb);
    expect(lost).toBe(true);
    expect(tb.screen).toBe("match");
    expect(ta.view.phase).toBe("invite");
    // The inviter says hello again (on its own after 8 + 15 s, or when the user taps 🔄).
    await vi.advanceTimersByTimeAsync(23_100);
    await settle(ta, tb);
    expect(ta.record.game.b).toBe(tb.record.me);
    expect(ta.view.phase).toBe("play");
    expect(tb.view.phase).toBe("play");
  });
});

describe("a core or a board that misbehaves", () => {
  it("tells the user after 8 s even while the core is still trying to send, and tries again once it took the hello", async () => {
    const core = fakeCore();
    // The core keeps the first hello for 40 s (it is trying to reach the other phone), then takes it.
    let first = true;
    core.ft.live.send = vi.fn((data) => {
      core.sent.push(data);
      if (!first) return Promise.resolve(true);
      first = false;
      return new Promise((resolve) => setTimeout(() => resolve(true), 40_000));
    });
    const one = await table(core);
    await one.newMatch();
    await vi.advanceTimersByTimeAsync(8_100);
    await settle(one);
    expect(one.notice).toEqual({ key: "notOpen" });
    expect(kinds(core)).toEqual(["hello"]);
    // The core takes it at 40 s; nobody answers; the next hello follows 15 s later.
    await vi.advanceTimersByTimeAsync(32_000 + 15_100);
    await settle(one);
    expect(kinds(core)).toEqual(["hello", "hello"]);
  });

  it("keeps working after drawing the screen failed once", async () => {
    const core = fakeCore();
    let failed = false;
    const one = new Table({
      ft: core.ft,
      game: toy,
      app: "1.0.0",
      t,
      onChange: () => {
        if (failed) return;
        failed = true;
        throw new Error("the board could not be drawn");
      },
    });
    await core.open({});
    await one.idle().catch(() => {});
    await one.newMatch();
    await settle(one);
    expect(one.screen).toBe("match");
    expect(kinds(core)).toEqual(["hello"]);
  });
});
