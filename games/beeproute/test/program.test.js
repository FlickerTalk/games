import { describe, expect, it } from "vitest";
import { MOST, add, countOf, decodeProgram, emptyEdit, encodeProgram, ring, ringState, slotsOf, stepsOf, trim, undo } from "../src/program.js";

const typed = (...commands) => commands.reduce((edit, command) => add(edit, command), emptyEdit());

describe("a program", () => {
  it("is a row of commands, each in its own slot", () => {
    const edit = typed("F", "F", "R", "F");
    expect(edit.items).toEqual(["F", "F", "R", "F"]);
    expect(slotsOf(edit.items)).toBe(4);
    expect(countOf(edit.items)).toBe(4);
    expect(stepsOf(edit.items).map(({ command, slot }) => `${command}${slot}`)).toEqual(["F0", "F1", "R2", "F3"]);
  });

  it("wraps the commands typed after the repeat button in a ring that runs them two or three times", () => {
    let edit = typed("R");
    edit = ring(edit);
    expect(ringState(edit)).toBe("empty");
    edit = add(add(edit, "F"), "L");
    expect(ringState(edit)).toBe("open");
    edit = ring(edit);
    expect(ringState(edit)).toBe("none");
    edit = add(edit, "F");
    expect(edit.items).toEqual(["R", { times: 2, body: ["F", "L"] }, "F"]);
    expect(slotsOf(edit.items)).toBe(4);
    expect(countOf(edit.items)).toBe(5);
    expect(stepsOf(edit.items).map(({ command, slot }) => `${command}${slot}`)).toEqual(["R0", "F1", "L2", "F1", "L2", "F3"]);
  });

  it("turns an empty ring from two to three times, then takes it away", () => {
    let edit = ring(typed("F"));
    expect(edit.items.at(-1)).toEqual({ times: 2, body: [] });
    edit = ring(edit);
    expect(edit.items.at(-1)).toEqual({ times: 3, body: [] });
    expect(ringState(edit)).toBe("empty");
    edit = ring(edit);
    expect(edit.items).toEqual(["F"]);
    expect(ringState(edit)).toBe("none");
  });

  it("takes back the last command, opening a closed ring first so its last command goes next", () => {
    let edit = ring(typed("F"));
    edit = ring(add(add(edit, "F"), "R"));
    edit = undo(edit);
    expect(ringState(edit)).toBe("open");
    expect(edit.items).toEqual(["F", { times: 2, body: ["F", "R"] }]);
    edit = undo(edit);
    expect(edit.items).toEqual(["F", { times: 2, body: ["F"] }]);
    edit = undo(undo(edit));
    expect(edit.items).toEqual(["F"]);
    expect(undo(emptyEdit())).toEqual(emptyEdit());
  });

  it("cuts everything from a slot on, so a wrong command and the ones after it go together", () => {
    const edit = ring(add(add(ring(typed("F", "L")), "F"), "F"));
    const cut = trim(add(edit, "R"), 3);
    expect(cut.items).toEqual(["F", "L", { times: 2, body: ["F"] }]);
    expect(ringState(cut)).toBe("open");
    expect(trim(typed("F", "R"), 0).items).toEqual([]);
  });

  it("holds at most twenty commands", () => {
    let edit = emptyEdit();
    for (let at = 0; at < MOST + 5; at += 1) edit = add(edit, "F");
    expect(slotsOf(edit.items)).toBe(MOST);
    expect(MOST).toBe(20);
  });

  it("travels as one short move and comes back the same, refusing anything else", () => {
    const edit = add(ring(add(add(ring(ring(typed("U", "F"))), "F"), "R")), "L");
    const code = encodeProgram(edit.items);
    expect(code).toBe("PUF3FR)L");
    expect(decodeProgram(code)).toEqual(edit.items);
    expect(decodeProgram("PF")).toEqual(["F"]);
    for (const bad of [null, "", "P", "F", "PX", "P2)", "P2F", "P2F2F))", "PF)", `P${"F".repeat(MOST + 1)}`]) expect(decodeProgram(bad), String(bad)).toBeNull();
  });
});
