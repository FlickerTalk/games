import { decodeLevel, encodeLevel } from "./level.js";
import { decodeProgram, emptyEdit, encodeProgram } from "./program.js";
import { nextHint, shortest } from "./solver.js";

export const BACK_MS = 1100;
export const END_MS = 1300;
export const STRUGGLE = 2;

export const roundKey = (state) => `round/${state.chat ?? "-"}`;

export function freshRound({ kind, level, maker = null, driver = "me", loops = false, seed = null }) {
  return {
    kind,
    level,
    code: encodeLevel(level),
    best: shortest(level)?.length ?? 1,
    maker,
    driver,
    loops,
    seed,
    edit: emptyEdit(),
    fails: 0,
    run: null,
    failed: null,
    finished: null,
    wrong: null,
    back: null,
    script: null,
    scriptAt: 0,
  };
}

export function commandsFor(round) {
  return ["L", "F", "R", ...(round.level.cells.includes("D") ? ["U"] : []), ...(round.loops ? ["ring"] : [])];
}

export function savedRound(round) {
  return JSON.stringify({ v: 1, kind: round.kind, code: round.code, maker: round.maker, loops: round.loops, seed: round.seed, program: round.edit.items.length ? encodeProgram(round.edit.items) : null, fails: round.fails });
}

export function keptRound(kept) {
  if (kept?.v !== 1 || !["level", "friend"].includes(kept.kind)) return null;
  const level = decodeLevel(kept.code);
  if (!level) return null;
  const items = kept.program ? decodeProgram(kept.program) : [];
  const fails = Number.isInteger(kept.fails) && kept.fails >= 0 ? kept.fails : 0;
  const maker = ["flick", "friend"].includes(kept.maker) ? kept.maker : null;
  return { ...freshRound({ kind: kept.kind, level, maker, loops: kept.loops === true, seed: typeof kept.seed === "string" ? kept.seed : null }), edit: { items: items ?? [], open: false }, fails };
}

export function hintOf(round, { taught }) {
  if (round.driver !== "me" || (taught && round.fails < STRUGGLE)) return null;
  const hint = nextHint(round.level, round.edit.items);
  if (!hint) return null;
  return hint.cut === null ? { kind: "command", value: hint.command } : { kind: "undo", value: "undo" };
}
