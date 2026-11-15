import { describe, expect, it } from "vitest";
import { checkGifts, giftDue, giftSchedule, ownedLooks } from "../../src/progress/gifts.js";

const VEHICLES = ["car", "motorbike", "kart", "truck", "bus", "tractor", "police", "fire", "taxi", "rocket", "ufo"];
const racer = checkGifts({ looks: VEHICLES, free: 5 });

describe("a game's surprise gifts", () => {
  it("are the looks after the free ones, each arriving at a fixed count of wins, every two to four wins by default", () => {
    expect(racer.every).toEqual([2, 3, 4]);
    expect(giftSchedule(racer)).toEqual([
      { look: "tractor", at: 2 },
      { look: "police", at: 5 },
      { look: "fire", at: 9 },
      { look: "taxi", at: 11 },
      { look: "rocket", at: 14 },
      { look: "ufo", at: 18 },
    ]);
    expect(giftSchedule(checkGifts({ looks: ["a", "b", "c", "d"], free: 1, every: [3] })).map(({ at }) => at)).toEqual([3, 6, 9]);
  });

  it("start with the free looks owned, then add each received one in the order the game declares", () => {
    expect(ownedLooks(racer, [])).toEqual(["car", "motorbike", "kart", "truck", "bus"]);
    expect(ownedLooks(racer, ["ufo", "tractor"])).toEqual(["car", "motorbike", "kart", "truck", "bus", "tractor", "ufo"]);
  });

  it("give the next look only when the wins reach its count, in the declared order, and each one once", () => {
    const received = [];
    const given = [];
    for (let wins = 1; wins <= 40; wins += 1) {
      const gift = giftDue(racer, received, wins);
      if (gift) {
        received.push(gift);
        given.push([wins, gift]);
      }
    }
    expect(given).toEqual([[2, "tractor"], [5, "police"], [9, "fire"], [11, "taxi"], [14, "rocket"], [18, "ufo"]]);
  });

  it("never give a free look, nor anything once every look is owned", () => {
    expect(giftDue(racer, VEHICLES.slice(5), 500)).toBeNull();
    expect(giftDue(checkGifts({ looks: ["a", "b"], free: 2 }), [], 500)).toBeNull();
    expect(giftSchedule(checkGifts({ looks: ["a", "b"], free: 2 }))).toEqual([]);
  });

  it("go on from the first missing look when the received ones are out of order", () => {
    expect(giftDue(racer, ["police"], 4)).toBeNull();
    expect(giftDue(racer, ["police"], 5)).toBe("tractor");
  });

  it("are checked when the game is defined", () => {
    const broken = [
      [null, "looks"],
      [{ free: 1 }, "looks"],
      [{ looks: [], free: 1 }, "looks"],
      [{ looks: ["a", "a"], free: 1 }, "looks"],
      [{ looks: ["a", ""], free: 1 }, "looks"],
      [{ looks: ["a", 7], free: 1 }, "looks"],
      [{ looks: ["a", "x".repeat(65)], free: 1 }, "looks"],
      [{ looks: ["a", "b"] }, "free"],
      [{ looks: ["a", "b"], free: 0 }, "free"],
      [{ looks: ["a", "b"], free: 3 }, "free"],
      [{ looks: ["a", "b"], free: 1.5 }, "free"],
      [{ looks: ["a", "b"], free: 1, every: [] }, "every 2 to 4 wins"],
      [{ looks: ["a", "b"], free: 1, every: [1] }, "every 2 to 4 wins"],
      [{ looks: ["a", "b"], free: 1, every: [5] }, "every 2 to 4 wins"],
      [{ looks: ["a", "b"], free: 1, every: [2.5] }, "every 2 to 4 wins"],
      [{ looks: ["a", "b"], free: 1, every: 3 }, "every 2 to 4 wins"],
    ];
    for (const [gifts, message] of broken) expect(() => checkGifts(gifts), JSON.stringify(gifts)).toThrow(message);
  });

  it("keep their own copy of what was declared", () => {
    const looks = ["a", "b", "c"];
    const every = [4];
    const gifts = checkGifts({ looks, free: 1, every });
    looks.push("d");
    every[0] = 2;
    expect(giftSchedule(gifts)).toEqual([{ look: "b", at: 4 }, { look: "c", at: 8 }]);
    expect(Object.isFrozen(gifts) && Object.isFrozen(gifts.looks) && Object.isFrozen(gifts.every)).toBe(true);
  });
});
