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
