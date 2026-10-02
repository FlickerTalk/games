// A toy game for the kit's own tests and for the build's fixture: no test library inside, so
// it can be bundled for a browser too.

/**
 * A toy game for the kit's own tests. Moves are strings: "p" passes, "w" wins for the side that
 * plays it, "d" ends in a draw. Anything else breaks the rules.
 */
export const toy = {
  id: "toy",
  icon: "🧸",
  gv: 1,
  initial: () => ({ moves: [], over: null }),
  turn: (state) => state.moves.length % 2,
  play(state, move, side) {
    if (state.over) return { error: "over" };
    if (side !== state.moves.length % 2) return { error: "turn" };
    if (!["p", "w", "d"].includes(move)) return { error: "bad" };
    const over = move === "w" ? { winner: side } : move === "d" ? { winner: null } : null;
    return { state: { moves: [...state.moves, move], over } };
  },
  result: (state) => state.over,
};
