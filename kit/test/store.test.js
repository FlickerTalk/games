// Where matches are kept: one record each, `game/<chat>/<id>`, in the plugin's own records. A
// match belongs to the conversation it is played in (`chat`, from `onOpen`): nothing outside that
// conversation's partition is listed, loaded, joined over or deleted. Written on every change,
// because the plugin is never told it is being closed.
import { describe, expect, it } from "vitest";
import { newMatch } from "../src/match.js";
import { CHAT_LENGTH, exists, forget, isChat, keyOf, list, load, save } from "../src/store.js";
import { fakeCore } from "./helpers.js";

const CHAT = "chat-with-c";
const OTHER = "chat-with-b";

describe("the kept matches", () => {
  it("are one record each under game/<chat>/, and come back as they went", async () => {
    const { ft, records } = fakeCore();
    const match = newMatch({ g: "toy", gv: 1, id: "m1", now: 10 });
    expect(keyOf(CHAT, "m1")).toBe("game/chat-with-c/m1");
    expect(await save(ft.records, CHAT, match)).toBe(true);
    expect(JSON.parse(records.get("game/chat-with-c/m1"))).toEqual(match);
    expect(await load(ft.records, CHAT, "m1")).toEqual(match);
    expect(await load(ft.records, CHAT, "nope")).toBeNull();
  });

  it("keep each conversation apart: the same match id in two of them is two matches", async () => {
    const { ft, records } = fakeCore();
    await save(ft.records, CHAT, newMatch({ g: "toy", gv: 1, id: "m1", me: "withc", now: 1 }));
    await save(ft.records, OTHER, newMatch({ g: "toy", gv: 1, id: "m1", me: "withb", now: 2 }));
    expect((await load(ft.records, CHAT, "m1")).me).toBe("withc");
    expect((await load(ft.records, OTHER, "m1")).me).toBe("withb");
    expect((await list(ft.records, CHAT, "toy")).map((one) => one.me)).toEqual(["withc"]);
    expect(await exists(ft.records, "chat-with-d", "m1")).toBe(false);
    await forget(ft.records, OTHER, "m1");
    expect(records.has("game/chat-with-c/m1")).toBe(true);
    expect(records.has("game/chat-with-b/m1")).toBe(false);
  });

  it("list the newest first, for this game only, and leave out what is broken", async () => {
    const { ft, records } = fakeCore();
    await save(ft.records, CHAT, newMatch({ g: "toy", gv: 1, id: "old", now: 1 }));
    await save(ft.records, CHAT, newMatch({ g: "toy", gv: 1, id: "new", now: 3 }));
    await save(ft.records, CHAT, { ...newMatch({ g: "toy", gv: 1, id: "mid", now: 2 }), updated: 2 });
    await save(ft.records, CHAT, newMatch({ g: "chess", gv: 1, id: "other", now: 9 }));
    records.set("game/chat-with-c/broken", "{not json");
    records.set("game/chat-with-c/odd", JSON.stringify({ v: 1, id: "odd" }));
    records.set("game/chat-with-c/later", JSON.stringify({ ...newMatch({ g: "toy", gv: 1, id: "later" }), v: 2 }));
    records.set("game/chat-with-c/moved", JSON.stringify(newMatch({ g: "toy", gv: 1, id: "elsewhere" })));
    records.set("game/old-layout", JSON.stringify(newMatch({ g: "toy", gv: 1, id: "old-layout" })));
    records.set("notes/x", "{}");
    expect((await list(ft.records, CHAT, "toy")).map((match) => match.id)).toEqual(["new", "mid", "old"]);
    // Something unreadable is still something: it is never joined over.
    expect(await exists(ft.records, CHAT, "later")).toBe(true);
  });

  it("say so when the phone has no room left, and keep what was there", async () => {
    const { ft, records } = fakeCore({ quota: 600 });
    const match = newMatch({ g: "toy", gv: 1, id: "m1" });
    expect(await save(ft.records, CHAT, match)).toBe(true);
    const big = { ...match, game: { ...match.game, moves: Array(200).fill("p") } };
    expect(await save(ft.records, CHAT, big)).toBe(false);
    expect(JSON.parse(records.get("game/chat-with-c/m1")).game.moves).toEqual([]);
  });

  it("know a conversation id when they see one, and fit the core's 128-byte keys with the longest ids", () => {
    expect(CHAT_LENGTH).toBe(43);
    expect(isChat("a".repeat(43))).toBe(true);
    expect(isChat("a_B-9")).toBe(true);
    for (const bad of ["", "a".repeat(44), "a/b", "../x", undefined, null, 7]) expect(isChat(bad), String(bad)).toBe(false);
    expect(new TextEncoder().encode(keyOf("c".repeat(43), "d".repeat(64))).length).toBeLessThanOrEqual(128);
    expect(() => keyOf("a/b", "m1")).toThrow();
  });
});
