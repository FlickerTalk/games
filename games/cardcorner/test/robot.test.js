import { describe, expect, it } from "vitest";
import { seeded } from "../../../kit/test/helpers.js";
import { card, sameKind } from "../src/card.js";
import { robot } from "../src/robot.js";
import { initial, play, result, turn } from "../src/rules.js";

function round(choice, seed) {
  const random = seeded(seed);
  const memories = [{}, {}];
  let state = initial();
  let moves = 0;
  while (!result(state)) {
    const side = turn(state);
    const move = state.phase === "choose" && !state.handed && side === 0 ? choice : robot.move(state, side, memories[side], random);
    const played = play(state, move, side);
    if (played.error) throw new Error(`side ${side} played ${move}: ${played.error}`);
    state = played.state;
    moves += 1;
    if (moves > 3000) throw new Error("no end");
  }
  return { state, moves };
}

const playing = (game, table, next = 0) => ({ ...initial(), phase: "play", game, commit: "x", table, next });

describe("Flick at the card table", () => {
  it("plays a whole round of each of the four games to its end, whatever the cards", () => {
    for (const choice of ["gp16", "gp24", "gw", "gr", "gf"]) {
      for (const seed of [1, 2, 3, 4, 5, 6]) {
        const { state } = round(choice, seed);
        expect(result(state).reason, `${choice} ${seed}`).not.toBe("cheat");
      }
    }
  });

  it("leaves the choice of the game to the player when it starts, and waits for nothing while shuffling", () => {
    expect(robot.move(initial(), 0, {}, seeded(1))).toBe("g?");
    expect(robot.unseen(initial())).toBe(true);
    expect(robot.unseen({ ...initial(), phase: "shuffle" })).toBe(true);
    expect(robot.unseen(playing("war", {}))).toBe(false);
    expect(robot.move({ ...initial(), end: { winner: 0 } }, 0, {}, seeded(1))).toBeNull();
    expect(robot.move({ ...initial(), handed: true, next: 1 }, 1, {}, seeded(1))).toMatch(/^g[pwrf]/);
  });

  it("at Pairs takes a pair it has seen, and otherwise turns a card it has not seen, never knowing a card that was not turned", () => {
    const cards = [card(1, 3), card(0, 5), card(2, 3), card(3, 5), card(1, 8), card(2, 8)];
    const table = { cards, owner: cards.map(() => null), up: [], miss: false, won: [0, 0], seen: [0, 2], took: null };
    const sure = () => 0;
    const memory = {};
    const first = robot.move(playing("pairs", table), 0, memory, sure);
    expect(["f0", "f2"]).toContain(first);
    const second = robot.move(playing("pairs", { ...table, up: [Number(first.slice(1))] }), 0, memory, sure);
    expect(sameKind(cards[Number(first.slice(1))], cards[Number(second.slice(1))])).toBe(true);
    const blind = { ...table, seen: [] };
    for (let seed = 0; seed < 20; seed += 1) {
      const fresh = {};
      const one = Number(robot.move(playing("pairs", blind), 0, fresh, seeded(seed)).slice(1));
      const two = Number(robot.move(playing("pairs", { ...blind, up: [one], seen: [one] }), 0, fresh, seeded(seed + 100)).slice(1));
      expect(two).not.toBe(one);
    }
    const hits = Array.from({ length: 200 }, (_, seed) => {
      const fresh = {};
      const one = Number(robot.move(playing("pairs", blind), 0, fresh, seeded(seed)).slice(1));
      const two = Number(robot.move(playing("pairs", { ...blind, up: [one], seen: [one] }), 0, fresh, seeded(seed + 1000)).slice(1));
      return sameKind(cards[one], cards[two]);
    }).filter(Boolean).length;
    expect(hits).toBeLessThan(80);
  });

  it("at Pairs forgets some of the cards it saw, so it can be beaten", () => {
    const cards = Array.from({ length: 24 }, (_, at) => card(at % 2 ? 2 : 1, Math.floor(at / 2)));
    const table = { cards, owner: cards.map(() => null), up: [], miss: false, won: [0, 0], seen: cards.map((_, at) => at), took: null };
    const memory = {};
    robot.move(playing("pairs", table), 0, memory, seeded(9));
    expect(memory.pairs.known.length).toBeGreaterThan(6);
    expect(memory.pairs.known.length).toBeLessThan(22);
  });

  it("at Rummy takes a discard that completes a meld, lays its melds, adds what fits and throws away a card it has no use for", () => {
    const hand = [card(0, 2), card(0, 3), card(1, 9), card(2, 12)];
    const table = { hands: [hand, [1, 2]], stock: [40, 41], discard: [card(0, 4)], melds: [], step: "draw", took: null, turns: 0 };
    expect(robot.move(playing("rummy", table), 0, {}, () => 0)).toBe("dd");
    expect(robot.move(playing("rummy", { ...table, discard: [card(3, 7)] }), 0, {}, () => 0)).toBe("ds");
    const holding = { ...table, step: "play", hands: [[...hand, card(0, 4)], [1, 2]], took: card(0, 4) };
    expect(robot.move(playing("rummy", holding), 0, {}, () => 0)).toBe(`m${card(0, 2)}.${card(0, 3)}.${card(0, 4)}`);
    const adding = { ...table, step: "play", hands: [[card(0, 5), card(1, 9)], [1, 2]], melds: [[card(0, 2), card(0, 3), card(0, 4)]] };
    expect(robot.move(playing("rummy", adding), 0, {}, () => 0)).toBe(`a${card(0, 5)}.0`);
    const lone = { ...table, step: "play", hands: [[card(1, 4), card(2, 4), card(3, 12), card(0, 8)], [1, 2]] };
    expect(robot.move(playing("rummy", lone), 0, {}, () => 0)).toBe(`x${card(3, 12)}`);
    const kept = { ...lone, took: card(3, 12) };
    expect(robot.move(playing("rummy", kept), 0, {}, () => 0)).toBe(`x${card(0, 8)}`);
  });

  it("at Go Fish asks only for a rank it holds, remembers what the player asked for, and draws when its hand is empty", () => {
    const table = { hands: [[card(0, 4), card(1, 4), card(0, 9)], [card(2, 6)]], pond: [1, 2, 3], books: [[], []], last: { by: 1, rank: 9, got: 0, drew: true, card: null, books: [] } };
    for (let seed = 0; seed < 30; seed += 1) expect(["a4", "a9"]).toContain(robot.move(playing("fish", table), 0, {}, seeded(seed)));
    expect(robot.move(playing("fish", table), 0, {}, () => 0)).toBe("a9");
    expect(robot.move(playing("fish", { ...table, hands: [[], [card(2, 6)]] }), 0, {}, () => 0)).toBe("d");
  });

  it("at War turns its card", () => {
    expect(robot.move(playing("war", { piles: [[1], [2]], up: [null, null] }), 0, {}, () => 0)).toBe("f");
  });
});
