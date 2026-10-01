// Where matches are kept: one record each, `game/<id>`, in the plugin's own records, written on
// every change because the plugin is never told it is being closed.
import { describe, expect, it } from "vitest";
import { newMatch } from "../src/match.js";
import { forget, keyOf, list, load, save } from "../src/store.js";
import { fakeCore } from "./helpers.js";

describe("the kept matches", () => {
  it("are one record each under game/, and come back as they went", async () => {
    const { ft, records } = fakeCore();
    const match = newMatch({ g: "toy", gv: 1, id: "m1", now: 10 });
    expect(keyOf("m1")).toBe("game/m1");
    expect(await save(ft.records, match)).toBe(true);
    expect(JSON.parse(records.get("game/m1"))).toEqual(match);
    expect(await load(ft.records, "m1")).toEqual(match);
    expect(await load(ft.records, "nope")).toBeNull();
  });

  it("list the newest first, for this game only, and leave out what is broken", async () => {
    const { ft, records } = fakeCore();
    await save(ft.records, newMatch({ g: "toy", gv: 1, id: "old", now: 1 }));
    await save(ft.records, newMatch({ g: "toy", gv: 1, id: "new", now: 3 }));
    await save(ft.records, { ...newMatch({ g: "toy", gv: 1, id: "mid", now: 2 }), updated: 2 });
    await save(ft.records, newMatch({ g: "chess", gv: 1, id: "other", now: 9 }));
    records.set("game/broken", "{not json");
    records.set("game/odd", JSON.stringify({ v: 1, id: "odd" }));
    records.set("game/later", JSON.stringify({ ...newMatch({ g: "toy", gv: 1, id: "later" }), v: 2 }));
    records.set("notes/x", "{}");
    expect((await list(ft.records, "toy")).map((match) => match.id)).toEqual(["new", "mid", "old"]);
  });

  it("say so when the phone has no room left, and keep what was there", async () => {
    const { ft, records } = fakeCore({ quota: 600 });
    const match = newMatch({ g: "toy", gv: 1, id: "m1" });
    expect(await save(ft.records, match)).toBe(true);
    const big = { ...match, game: { ...match.game, moves: Array(200).fill("p") } };
    expect(await save(ft.records, big)).toBe(false);
    expect(JSON.parse(records.get("game/m1")).game.moves).toEqual([]);
  });

  it("can be deleted", async () => {
    const { ft, records } = fakeCore();
    await save(ft.records, newMatch({ g: "toy", gv: 1, id: "m1" }));
    await forget(ft.records, "m1");
    expect(records.size).toBe(0);
  });
});
