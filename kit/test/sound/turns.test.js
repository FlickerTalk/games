import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineGame } from "../../src/index.js";
import { TIMING } from "../../src/table.js";
import { turnCues, withSound } from "../../src/sound/turns.js";
import { fakeCore, settle, toy, within } from "../helpers.js";

const seen = (fields) => ({ view: { index: 0, phase: "play", myTurn: true, me: "a", round: { moves: [] }, result: null, ...fields } });

describe("the sounds of a turn", () => {
  it("say nothing when a match opens or nothing moved", () => {
    expect(turnCues(null, seen({}))).toEqual([]);
    expect(turnCues(seen({ round: { moves: [1] } }), seen({ round: { moves: [1] }, myTurn: false }))).toEqual([]);
  });

  it("tell the user's move from the other side's", () => {
    expect(turnCues(seen({}), seen({ round: { moves: [4] }, myTurn: false }))).toEqual(["place"]);
    expect(turnCues(seen({ myTurn: false }), seen({ round: { moves: [4] } }))).toEqual(["pop"]);
  });

  it("follow the last move with the round's end: won, lost or drawn", () => {
    const over = (winner) => seen({ round: { moves: [4] }, phase: "over", myTurn: false, result: { winner } });
    expect(turnCues(seen({}), over("a"))).toEqual(["place", "win"]);
    expect(turnCues(seen({ myTurn: false }), over("b"))).toEqual(["pop", "lose-soft"]);
    expect(turnCues(seen({}), over(null))).toEqual(["place", "star"]);
    expect(turnCues(seen({ round: { moves: [4] } }), over("b"))).toEqual(["lose-soft"]);
  });

  it("stay quiet for a new round, and take a game's own choice of sounds", () => {
    expect(turnCues(seen({ phase: "over", round: { moves: [1, 2] } }), seen({ index: 1 }))).toEqual([]);
    expect(turnCues(seen({}), seen({ round: { moves: [4] } }), { mine: "pick", theirs: null })).toEqual(["pick"]);
    expect(turnCues(seen({ myTurn: false }), seen({ round: { moves: [4] } }), { theirs: null })).toEqual([]);
  });
});

const quiet = { ...toy, robot: { move: () => "p" } };
const mounted = [];
const board = {
  mount(host, ctx) {
    mounted.push(ctx);
    const paint = (next) => {
      host.innerHTML = ["p", "w", "d"].map((move) => `<button data-move="${move}" ${next.canPlay ? "" : "disabled"}>${move}</button>`).join("");
      host.onclick = (event) => event.target.dataset.move && next.play(event.target.dataset.move);
    };
    paint(ctx);
    return { update: paint };
  },
};
const game = defineGame(withSound({ ...quiet, tag: "ft-toy-sound", app: "1.0.0", board, texts: { en: { name: "Toy" } } }, { tune: "calm" }));

const tick = () => settle([...document.querySelectorAll("ft-toy-sound")].map((element) => element.table));
async function solo() {
  const core = fakeCore();
  const element = document.createElement("ft-toy-sound");
  element.ft = core.ft;
  document.body.append(element);
  await core.open({ live: false, solo: true });
  await tick();
  element.table.random = () => new Uint8Array(32);
  return element;
}
const press = async (element, selector) => {
  within(element, selector).click();
  await tick();
};
const think = async () => {
  await vi.advanceTimersByTimeAsync(TIMING.think);
  await tick();
};

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = "";
  mounted.length = 0;
});
afterEach(() => vi.useRealTimers());

describe("a board game with sound", () => {
  it("shows the speaker and the music switch in the bar of a match, before its own buttons, and nowhere on the list", async () => {
    const element = await solo();
    expect(element.querySelector(".ftg-sound-buttons")).toBeNull();
    await press(element, '[data-kit="new"]');
    const group = element.querySelector('[data-part="bar"] > .ftg-sound-buttons');
    expect(group).not.toBeNull();
    expect(group.nextElementSibling.dataset.part).toBe("actions");
    expect(element.querySelector(".ftg-volume")).not.toBeNull();
    await press(element, '[data-kit="back"]');
    expect(element.querySelector(".ftg-sound-buttons")).toBeNull();
    expect(element.querySelector(".ftg-volume")).toBeNull();
  });

  it("plays its tune during a match, and stops it when the match leaves the screen", async () => {
    const music = vi.spyOn(game.sound, "music");
    const element = await solo();
    await press(element, '[data-kit="new"]');
    expect(music).toHaveBeenLastCalledWith("calm");
    await press(element, '[data-kit="back"]');
    expect(music).toHaveBeenLastCalledWith(null);
    music.mockRestore();
  });

  it("sounds the user's move, the phone's answer and the end of the round", async () => {
    const played = vi.spyOn(game.sound, "play");
    const element = await solo();
    await press(element, '[data-kit="new"]');
    await press(element, '[data-move="p"]');
    expect(played.mock.calls.map(([name]) => name)).toEqual(["place"]);
    await think();
    expect(played.mock.calls.map(([name]) => name)).toEqual(["place", "pop"]);
    await press(element, '[data-move="w"]');
    expect(played.mock.calls.map(([name]) => name)).toEqual(["place", "pop", "place", "win"]);
    expect(played.mock.calls.at(-1)[1].delay).toBeGreaterThan(0);
    played.mockRestore();
  });

  it("hands the board the sound, so a board can play its own effects", async () => {
    const element = await solo();
    await press(element, '[data-kit="new"]');
    expect(mounted[0].sound).toBe(game.sound);
    expect(element.querySelector('[data-move="p"]')).not.toBeNull();
  });

  it("keeps the game's own rules and fields, and adds only the board and the sound", () => {
    expect(game.play).toBe(quiet.play);
    expect(game.robot).toBe(quiet.robot);
    expect(game.board).not.toBe(board);
    expect(typeof game.sound.play).toBe("function");
  });
});
