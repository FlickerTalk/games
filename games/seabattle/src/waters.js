import { shipCells } from "./rules.js";

function answered(state, shooter) {
  const shots = new Map();
  state.shots[shooter].forEach((cell, at) => shots.set(cell, state.answers[1 - shooter][at]?.[0] ?? null));
  return shots;
}

export function theirWaters(state, me) {
  const they = 1 - me;
  const shots = answered(state, me);
  const found = state.sunk[they].map((ship) => ({ ...ship }));
  for (const ship of found) for (const cell of shipCells(ship)) shots.set(cell, "s");
  const starts = new Set(found.map((ship) => ship.start));
  const revealed = state.phase === "done" ? state.reveals[they]?.ships ?? [] : [];
  return {
    shots,
    found,
    shown: revealed.filter((ship) => !starts.has(ship.start)).map((ship) => ({ ...ship })),
    last: state.shots[me].at(-1) ?? null,
  };
}

export function myWaters(state, me, ships) {
  const they = 1 - me;
  const last = state.shots[they].at(-1) ?? null;
  if (!ships) return { shots: answered(state, they), ships: [], last };
  const fired = new Set(state.shots[they]);
  const shots = new Map();
  const fleet = ships.map((ship) => {
    const cells = shipCells(ship);
    const found = cells.every((cell) => fired.has(cell));
    for (const cell of cells) if (fired.has(cell)) shots.set(cell, found ? "s" : "h");
    return { ship, found };
  });
  for (const cell of fired) if (!shots.has(cell)) shots.set(cell, "m");
  return { shots, ships: fleet, last };
}
