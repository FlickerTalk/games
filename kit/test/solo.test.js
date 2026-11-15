import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KV, PROTOCOL, fromBase64, seal } from "../src/envelope.js";
import { defineGame } from "../src/index.js";
import { TIMING, Table } from "../src/table.js";
import { fakeCore, phones, settle, toy, within, words } from "./helpers.js";

const t = (key) => (key === "name" ? "Toy" : key);
const bytes = (value) => () => new Uint8Array(32).fill(value);
const steady = { ...toy, robot: { move: () => "p" } };
const kinds = (core) => core.sent.map((data) => JSON.parse(new TextDecoder().decode(fromBase64(data))).k);
const kept = (core, id) => JSON.parse(core.records.get(`game/${core.chat}/${id}`));

async function table(core, { game = steady, random, opening = {} } = {}) {
  const one = new Table({ ft: core.ft, game, app: "1.0.0", t, random });
  one.core = core;
  await core.open({ live: false, solo: true, ...opening });
  await one.idle();
  return one;
}

async function think(one) {
  await vi.advanceTimersByTimeAsync(TIMING.think);
  await one.idle();
}

const message = (fields) => seal({ p: PROTOCOL, kv: KV, g: "toy", gv: 1, app: "1.0.0", ...fields });

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("a match against the phone", () => {
  it("starts on this phone alone: kept under the conversation, the phone in the other seat, nothing on the wire", async () => {
    const core = fakeCore();
    const one = await table(core, { random: bytes(0) });
    expect(one.solo).toBe(true);
    expect(one.live).toBe(false);
    await one.newMatch();
    const record = one.record;
    expect(one.screen).toBe("match");
    expect(record.solo).toEqual({ memory: {} });
    expect(record.game.a).toBe(record.me);
    expect(record.game.b).toMatch(/^[a-z0-9]{16}$/);
    expect(record.game.b).not.toBe(record.me);
    expect(record.game.first).toBe(record.me);
    expect(record.game.toss).toEqual({});
    expect(one.view).toMatchObject({ phase: "play", myTurn: true, mySide: 0 });
    expect(kept(core, record.id)).toEqual(record);
    expect(core.ft.live.send).not.toHaveBeenCalled();
  });

  it("draws who starts on this phone", async () => {
    const one = await table(fakeCore(), { random: bytes(1) });
    await one.newMatch();
    expect(one.record.game.first).toBe(one.record.game.b);
    expect(one.view.mySide).toBe(1);
  });

  it("lets the phone play its turn after a short wait, and keeps the move", async () => {
    const core = fakeCore();
    const one = await table(core, { random: bytes(1) });
    await one.newMatch();
    await vi.advanceTimersByTimeAsync(TIMING.think - 1);
    await one.idle();
    expect(one.record.game.moves).toEqual([]);
    await think(one);
    expect(one.record.game.moves).toEqual(["p"]);
    expect(one.view.myTurn).toBe(true);
    expect(kept(core, one.record.id).game.moves).toEqual(["p"]);
  });

  it("takes at once a step the user does not see, and pauses only before a move the user sees", async () => {
    const asked = [];
    const hidden = { ...toy, robot: { move: () => "p", unseen: (state) => (asked.push(state.moves.length), state.moves.length === 0) } };
    const one = await table(fakeCore(), { game: hidden, random: bytes(1) });
    await one.newMatch();
    await vi.advanceTimersByTimeAsync(0);
    await one.idle();
    expect(one.record.game.moves).toEqual(["p"]);
    await one.play("p");
    await vi.advanceTimersByTimeAsync(TIMING.think - 1);
    await one.idle();
    expect(one.record.game.moves).toEqual(["p", "p"]);
    await vi.advanceTimersByTimeAsync(1);
    await one.idle();
    expect(one.record.game.moves).toEqual(["p", "p", "p"]);
    expect(asked).toEqual([0, 2]);
  });

  it("takes the user's move at once, never as pending, and the phone answers it", async () => {
    const one = await table(fakeCore(), { random: bytes(0) });
    await one.newMatch();
    await one.play("p");
    expect(one.record.game.moves).toEqual(["p"]);
    expect(one.view.pending).toBe(0);
    expect(one.record.heard).toBe(1);
    await think(one);
    expect(one.record.game.moves).toEqual(["p", "p"]);
    expect(one.record.heard).toBe(2);
    expect(one.view.myTurn).toBe(true);
  });

  it("does not let the user move in the phone's turn", async () => {
    const one = await table(fakeCore(), { random: bytes(1) });
    await one.newMatch();
    await one.play("w");
    expect(one.record.game.moves).toEqual([]);
    await think(one);
    expect(one.record.game.moves).toEqual(["p"]);
  });

  it("finds the phone's move with the kit's search when the game has no move of its own", async () => {
    const searched = { ...toy, robot: { moves: () => ["p", "d", "w"], score: () => 0 } };
    const one = await table(fakeCore(), { game: searched, random: bytes(1) });
    await one.newMatch();
    await think(one);
    expect(one.record.game.moves).toEqual(["w"]);
    expect(one.view.phase).toBe("over");
    expect(one.view.score).toEqual({ me: 0, them: 1, draws: 0 });
  });

  it("keeps what the game's robot remembers with the match", async () => {
    const remembering = { ...toy, robot: { move: (state, side, memory) => ((memory.turns = (memory.turns ?? 0) + 1), "p") } };
    const core = fakeCore();
    const one = await table(core, { game: remembering, random: bytes(1) });
    await one.newMatch();
    await think(one);
    expect(kept(core, one.record.id).solo.memory).toEqual({ turns: 1 });
  });

  it("tells the game's robot the language the game is shown in", async () => {
    const heard = [];
    const listening = { ...toy, robot: { move: (state, side, memory, random, context) => (heard.push(context), "p") } };
    const one = await table(fakeCore(), { game: listening, random: bytes(1), opening: { lang: "es" } });
    await one.newMatch();
    await think(one);
    expect(heard).toEqual([{ lang: "es" }]);
  });

  it("lets the user resign and play another round, which the phone starts when it is its turn", async () => {
    const one = await table(fakeCore(), { random: bytes(0) });
    await one.newMatch();
    await one.resign();
    expect(one.view.phase).toBe("over");
    expect(one.view.score).toEqual({ me: 0, them: 1, draws: 0 });
    await think(one);
    expect(one.record.game.moves).toEqual([{ x: "resign", by: one.record.me }]);
    await one.again();
    expect(one.view).toMatchObject({ phase: "play", index: 1, myTurn: false });
    await think(one);
    expect(one.record.game.moves.slice(1)).toEqual([{ x: "next" }, "p"]);
    expect(one.view.myTurn).toBe(true);
  });

  it("goes on after the game is closed and opened again, the phone playing when it is its turn", async () => {
    const core = fakeCore();
    const one = await table(core, { random: bytes(0) });
    await one.newMatch();
    await one.play("p");
    one.stopTimers();
    const again = await table(fakeCore({ records: core.records }));
    expect(again.matches.map(({ record }) => record.id)).toEqual([one.record.id]);
    await again.enter(one.record.id);
    expect(again.record.solo).toBeTruthy();
    expect(again.record.game.moves).toEqual(["p"]);
    await think(again);
    expect(again.record.game.moves).toEqual(["p", "p"]);
  });

  it("never says a word over the live channel, whatever the user does and whatever arrives", async () => {
    const core = fakeCore();
    const one = await table(core, { random: bytes(1) });
    await one.newMatch();
    await think(one);
    await one.play("p");
    await think(one);
    await one.resign();
    await one.again();
    await think(one);
    const { id, game } = one.record;
    await one.retry();
    await one.leave();
    await one.enter(id);
    await think(one);
    const before = structuredClone(one.record);
    await core.hear(message({ k: "hello", doc: "other", who: "someone", game: { a: "someone", b: null, first: null, toss: {}, moves: [], end: null } }));
    await core.hear(message({ k: "state", doc: id, who: game.b, game: { ...game, moves: [...game.moves, "w"] } }));
    await core.hear(message({ k: "bye", doc: id, who: game.b }));
    await one.idle();
    expect(one.record).toEqual(before);
    expect(one.notice).toBeNull();
    expect(one.prompt).toBeNull();
    await one.leave();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(core.ft.live.send).not.toHaveBeenCalled();
    expect(core.sent).toEqual([]);
  });

  it("is a solo match even when the app also says live, and still never sends", async () => {
    const core = fakeCore();
    const one = await table(core, { random: bytes(1), opening: { live: true } });
    expect(one.solo).toBe(true);
    expect(one.live).toBe(false);
    await one.newMatch();
    await think(one);
    await one.play("p");
    await think(one);
    expect(core.ft.live.send).not.toHaveBeenCalled();
  });

  it("sends nothing more once the app says solo, even with a match with a person on the screen", async () => {
    const { a, b } = phones();
    const live = async (core) => {
      const one = new Table({ ft: core.ft, game: steady, app: "1.0.0", t });
      await core.open({ live: true });
      await one.idle();
      return one;
    };
    const ta = await live(a);
    const tb = await live(b);
    await ta.newMatch();
    await settle([ta, tb]);
    expect(ta.view.phase).toBe("play");
    const sent = a.sent.length;
    await a.open({ live: false, solo: true });
    await ta.idle();
    if (ta.view.myTurn) await ta.play("p");
    await ta.resign();
    await ta.again();
    await ta.leave();
    await vi.advanceTimersByTimeAsync(60_000);
    await settle([ta, tb]);
    expect(a.sent.length).toBe(sent);
  });

  it("stays as today for a game without a robot, or outside a conversation", async () => {
    const plain = fakeCore();
    const one = await table(plain, { game: toy });
    expect(one.solo).toBe(false);
    expect(one.live).toBe(false);
    await one.newMatch();
    expect(one.notice).toEqual({ key: "needsChat" });
    expect(plain.records.size).toBe(0);

    const away = fakeCore();
    const two = await table(away, { opening: { chat: undefined } });
    expect(two.solo).toBe(false);
    await two.newMatch();
    expect(away.records.size).toBe(0);
  });

  it("keeps matches with the phone apart from matches with a person, and out of reach of the wire", async () => {
    const core = fakeCore();
    const one = await table(core, { random: bytes(0) });
    await one.newMatch();
    const alone = one.record;

    const person = fakeCore({ records: core.records });
    const live = new Table({ ft: person.ft, game: steady, app: "1.0.0", t });
    await person.open({ live: true });
    await live.idle();
    expect(live.solo).toBe(false);
    expect(live.matches).toEqual([]);
    await live.enter(alone.id);
    expect(live.screen).toBe("list");
    await live.newMatch();
    const withPerson = live.record.id;
    await person.hear(message({ k: "hello", doc: alone.id, who: alone.game.b, game: { ...alone.game, moves: ["w"] } }));
    await live.idle();
    expect(kinds(person)).toEqual(["hello", "deny"]);
    expect(kept(core, alone.id)).toEqual(alone);

    const back = await table(fakeCore({ records: core.records }));
    expect(back.matches.map(({ record }) => record.id)).toEqual([alone.id]);
    await back.enter(withPerson);
    expect(back.screen).toBe("list");
  });

  it("says something went wrong when the phone's move breaks the rules, and keeps nothing of it", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const broken = { ...toy, robot: { move: () => "x" } };
    const core = fakeCore();
    const one = await table(core, { game: broken, random: bytes(1) });
    await one.newMatch();
    await think(one);
    expect(one.notice).toEqual({ key: "error" });
    expect(one.record.game.moves).toEqual([]);
    expect(kept(core, one.record.id).game.moves).toEqual([]);
  });
});

const board = {
  mount(host, ctx) {
    const paint = (next) => {
      host.innerHTML = `${["p", "w"].map((move) => `<button data-move="${move}" ${next.canPlay ? "" : "disabled"}>${move}</button>`).join("")}`;
      host.onclick = (event) => {
        const move = event.target.closest("[data-move]")?.dataset.move;
        if (move) next.play(move);
      };
    };
    paint(ctx);
    return { update: paint };
  },
};

defineGame({ ...steady, tag: "ft-toy-solo", app: "1.0.0", board, texts: { en: { name: "Toy" }, es: { name: "Juguete" } } });

describe("the screen of a match against the phone", () => {
  const tick = () => settle([...document.querySelectorAll("ft-toy-solo")].map((element) => element.table));
  const text = (element) => words(element).replace(/\s+/g, " ");
  const band = (element) => {
    const node = element.querySelector(".ftg-notice .ftg-toast");
    return node && !node.hidden ? text(node).trim() : "";
  };

  async function phone(core, opening = {}) {
    const element = document.createElement("ft-toy-solo");
    element.ft = core.ft;
    document.body.append(element);
    await core.open({ live: false, solo: true, ...opening });
    await tick();
    return element;
  }

  async function press(element, selector) {
    const target = within(element, selector);
    if (!target) throw new Error(`nothing matches ${selector}`);
    target.click();
    await tick();
  }

  async function wait(element) {
    await vi.advanceTimersByTimeAsync(TIMING.think);
    await tick();
    expect(element.table.timers.robot).toBeNull();
  }

  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("offers a new match on the list, without the hint to open the game from a conversation", async () => {
    const element = await phone(fakeCore());
    expect(text(element)).toContain("No matches yet");
    expect(text(element)).not.toContain("from a conversation");
    for (const button of element.querySelectorAll('[data-kit="new"]')) expect(button.hasAttribute("disabled")).toBe(false);
    expect(element.querySelectorAll('[data-kit="new"]')).toHaveLength(2);
  });

  it("lets the user play on their turn, and says the phone is thinking in the band while it is the phone's turn", async () => {
    const element = await phone(fakeCore());
    element.table.random = bytes(1);
    await press(element, '[data-kit="new"]');
    expect(band(element)).toBe("The coin says FlickerTalk starts");
    expect(element.querySelector('[data-move="p"]').disabled).toBe(true);
    await wait(element);
    expect(band(element)).toBe("Your turn");
    expect(element.querySelector('[data-move="p"]').disabled).toBe(false);
    expect(element.querySelector(".ftg-player.them").classList.contains("here")).toBe(true);
    await press(element, '[data-move="p"]');
    expect(band(element)).toBe("Thinking…");
    expect(element.querySelector('[data-part="content"]').textContent).not.toContain("Thinking");
    await wait(element);
    expect(band(element)).toBe("Your turn");
  });

  it("ends a round with another round on offer and no way to send the result to the chat", async () => {
    const element = await phone(fakeCore());
    element.table.random = bytes(0);
    await press(element, '[data-kit="new"]');
    await press(element, '[data-move="w"]');
    expect(text(element)).toContain("You won");
    expect(element.querySelector('[data-kit="send"]')).toBeNull();
    expect(element.querySelector('[data-kit="again"]')).not.toBeNull();
    await press(element, '[data-kit="again"]');
    expect(element.table.view).toMatchObject({ phase: "play", index: 1, myTurn: false });
  });

  it("never asks the live channel for anything, and shows no notice about the connection", async () => {
    const core = fakeCore();
    const element = await phone(core);
    element.table.random = bytes(1);
    await press(element, '[data-kit="new"]');
    await wait(element);
    await press(element, '[data-move="p"]');
    await wait(element);
    await press(element, '[data-kit="resign"]');
    await press(element, '[data-kit="yes"]');
    await press(element, '[data-kit="again"]');
    await wait(element);
    await press(element, '[data-kit="back"]');
    await press(element, '[data-kit="enter"]');
    await vi.advanceTimersByTimeAsync(60_000);
    await tick();
    expect(element.querySelector('[data-kit="retry"]')).toBeNull();
    for (const said of ["cannot be reached", "does not have", "has to open", "Reaching", "not reached"]) expect(text(element)).not.toContain(said);
    element.remove();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(core.ft.live.send).not.toHaveBeenCalled();
  });

  it("speaks the user's language while the phone thinks", async () => {
    const element = await phone(fakeCore(), { lang: "es" });
    element.table.random = bytes(0);
    await press(element, '[data-kit="new"]');
    await press(element, '[data-move="p"]');
    expect(band(element)).toBe("Pensando…");
  });

  it("calls the other side FlickerTalk, on its chip, when it starts and when the user would resign", async () => {
    const element = await phone(fakeCore());
    element.table.random = bytes(1);
    await press(element, '[data-kit="new"]');
    expect(text(element.querySelector(".ftg-player.them .who"))).toBe("FlickerTalk");
    expect(band(element)).toBe("The coin says FlickerTalk starts");
    await wait(element);
    await press(element, '[data-kit="resign"]');
    expect(element.alert.message).toBe("Resign this round? FlickerTalk wins it.");
  });

  it("calls the other side FlickerTalk in the user's language too", async () => {
    const element = await phone(fakeCore(), { lang: "es" });
    element.table.random = bytes(1);
    await press(element, '[data-kit="new"]');
    expect(text(element.querySelector(".ftg-player.them .who"))).toBe("FlickerTalk");
    expect(band(element)).toBe("La moneda dice que empieza FlickerTalk");
    await wait(element);
    await press(element, '[data-kit="resign"]');
    expect(element.alert.message).toBe("¿Rendirte en esta ronda? La gana FlickerTalk.");
  });

  it("keeps the words of a match between two people", async () => {
    const { a, b } = phones();
    const one = await phone(a, { live: true, solo: false });
    const two = await phone(b, { live: true, solo: false });
    one.table.random = bytes(1);
    await press(one, '[data-kit="new"]');
    await tick();
    const second = one.table.view.myTurn ? two : one;
    expect(text(second.querySelector(".ftg-player.them .who"))).toBe("Opponent");
    expect(band(second)).toBe("The coin says they start");
    await press(second, '[data-kit="resign"]');
    expect(second.alert.message).toBe("Resign this round? The other person wins it.");
  });
});
