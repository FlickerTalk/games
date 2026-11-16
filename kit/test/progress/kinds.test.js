import { describe, expect, it } from "vitest";
import { defineProgress } from "../../src/progress/index.js";
import { checkGifts, kindOf } from "../../src/progress/gifts.js";
import { freshRecord, readRecord } from "../../src/progress/record.js";

const LOOKS = ["lanterns", "patio", "birds", "rooftop", "leaves", "greenhouse", "bubbles"];
const KINDS = { effect: ["lanterns", "birds", "leaves", "bubbles"], court: ["patio", "rooftop", "greenhouse"] };

const court = defineProgress({ gifts: { looks: LOOKS, free: 2, every: [2], kinds: KINDS } });

describe("gifts of several kinds", () => {
  it("say which kind each look is", () => {
    const gifts = checkGifts({ looks: LOOKS, free: 2, kinds: KINDS });
    expect(kindOf(gifts, "birds")).toBe("effect");
    expect(kindOf(gifts, "rooftop")).toBe("court");
    expect(kindOf(gifts, "nothing")).toBeNull();
    expect(kindOf(checkGifts({ looks: ["a", "b"], free: 1 }), "a")).toBeNull();
  });

  it("start with the first free look of each kind chosen", () => {
    expect(court.fresh().chosen).toEqual({ effect: "lanterns", court: "patio" });
  });

  it("make a gift the chosen look of its own kind only", () => {
    let record = court.fresh();
    const first = court.awardRound(court.awardRound(record, { won: true }).record, { won: true });
    expect(first.gift).toBe("birds");
    expect(first.record.chosen).toEqual({ effect: "birds", court: "patio" });
    record = first.record;
    const second = court.awardRound(court.awardRound(record, { won: true }).record, { won: true });
    expect(second.gift).toBe("rooftop");
    expect(second.record.chosen).toEqual({ effect: "birds", court: "rooftop" });
  });

  it("let the player choose one owned look of each kind, and nothing else", () => {
    const record = court.fresh();
    expect(court.choose(record, "patio").chosen).toEqual({ effect: "lanterns", court: "patio" });
    expect(court.choose(record, "rooftop").chosen).toEqual(record.chosen);
    const owned = { ...record, received: ["birds"] };
    expect(court.choose(owned, "birds").chosen).toEqual({ effect: "birds", court: "patio" });
  });

  it("read back a choice per kind, putting back the first free look where a choice is wrong", () => {
    const spec = court.spec;
    const raw = { v: 1, received: ["birds"], chosen: { effect: "birds", court: "rooftop" } };
    expect(readRecord(spec, raw).chosen).toEqual({ effect: "birds", court: "patio" });
    expect(readRecord(spec, { v: 1, chosen: "lanterns" }).chosen).toEqual(freshRecord(spec).chosen);
    expect(readRecord(spec, { v: 1, chosen: { effect: "patio", court: "lanterns", extra: "x" } }).chosen).toEqual({ effect: "lanterns", court: "patio" });
  });

  it("are checked when the game is defined", () => {
    const broken = [
      [{ looks: LOOKS, free: 2, kinds: [] }, "kinds"],
      [{ looks: LOOKS, free: 2, kinds: {} }, "kinds"],
      [{ looks: LOOKS, free: 2, kinds: { effect: ["lanterns", "birds", "leaves", "bubbles"], court: [] } }, "kinds"],
      [{ looks: LOOKS, free: 2, kinds: { effect: ["lanterns", "birds", "leaves", "bubbles"], court: ["patio", "rooftop"] } }, "greenhouse"],
      [{ looks: LOOKS, free: 2, kinds: { effect: ["lanterns", "birds", "leaves", "bubbles", "patio"], court: ["patio", "rooftop", "greenhouse"] } }, "patio"],
      [{ looks: LOOKS, free: 2, kinds: { effect: ["lanterns", "birds", "leaves", "bubbles", "moon"], court: ["patio", "rooftop", "greenhouse"] } }, "moon"],
      [{ looks: LOOKS, free: 1, kinds: KINDS }, "court"],
      [{ looks: LOOKS, free: 2, kinds: { effect: "lanterns" } }, "kinds"],
    ];
    for (const [gifts, message] of broken) expect(() => checkGifts(gifts), JSON.stringify(gifts)).toThrow(message);
  });

  it("keep a game without kinds choosing one look, as before", () => {
    const one = defineProgress({ gifts: { looks: ["red", "blue", "kite"], free: 2, every: [2] } });
    expect(one.fresh().chosen).toBe("red");
    expect(one.choose(one.fresh(), "blue").chosen).toBe("blue");
  });
});
