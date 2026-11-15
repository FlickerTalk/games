// The plugin frame allows no workers, so the search runs on the main thread and stops on its budget.

export const WIN = 1_000_000;
export const DEPTH = 4;
export const BUDGET_MS = 300;

const OUT_OF_TIME = Symbol("out of time");
const CHECK_EVERY = 64;

function after(game, state, move, side) {
  try {
    const played = game.play(state, move, side);
    return played && !played.error ? played.state : null;
  } catch {
    return null;
  }
}

function children(game, state) {
  const side = game.turn(state);
  const found = [];
  for (const move of game.robot.moves(state, side)) {
    const next = after(game, state, move, side);
    if (next) found.push({ move, state: next });
  }
  return found;
}

function ended(result, side, ply) {
  if (result.winner === null || result.winner === undefined) return 0;
  return result.winner === side ? WIN - ply : ply - WIN;
}

function searcher(game, side, { clock, deadline }) {
  let nodes = 0;
  let timed = false;
  let cut = false;
  const value = (state, left, alpha, beta, ply) => {
    if (timed && (nodes += 1) % CHECK_EVERY === 0 && clock() > deadline) throw OUT_OF_TIME;
    const result = game.result(state);
    if (result) return ended(result, side, ply);
    if (left <= 0) {
      cut = true;
      return game.robot.score(state, side);
    }
    const mine = game.turn(state) === side;
    let best = mine ? -Infinity : Infinity;
    for (const child of children(game, state)) {
      const found = value(child.state, left - 1, alpha, beta, ply + 1);
      if (mine) alpha = Math.max(alpha, (best = Math.max(best, found)));
      else beta = Math.min(beta, (best = Math.min(best, found)));
      if (alpha >= beta) break;
    }
    return Number.isFinite(best) ? best : game.robot.score(state, side);
  };
  const rank = (roots, depth, slack) => {
    timed = depth > 1;
    cut = false;
    let top = -Infinity;
    const ranked = roots.map((root) => {
      const found = value(root.state, depth - 1, top - slack - 1e-9, Infinity, 1);
      top = Math.max(top, found);
      return { ...root, value: found };
    });
    return { ranked: ranked.sort((one, two) => two.value - one.value), exhaustive: !cut };
  };
  return rank;
}

export function search(game, state, side, { depth = DEPTH, budgetMs = BUDGET_MS, slack = 0, clock = Date.now } = {}) {
  let roots = children(game, state);
  if (!roots.length) return { move: null, value: game.robot.score(state, side), choices: [] };
  const rank = searcher(game, side, { clock, deadline: clock() + budgetMs });
  for (let limit = 1; limit <= Math.max(1, depth); limit += 1) {
    try {
      const { ranked, exhaustive } = rank(roots, limit, slack);
      roots = ranked;
      if (exhaustive || ranked[0].value > WIN / 2) break;
    } catch (error) {
      if (error !== OUT_OF_TIME) throw error;
      break;
    }
  }
  const top = roots[0].value;
  return { move: roots[0].move, value: top, choices: roots.filter((root) => root.value >= top - slack).map((root) => root.move) };
}

export function robotMove(game, state, side, memory, random = Math.random) {
  const robot = game.robot;
  if (typeof robot.move === "function") return robot.move(state, side, memory, random);
  const { choices } = search(game, state, side, { depth: robot.depth, budgetMs: robot.budgetMs, slack: robot.slack });
  if (!choices.length) return null;
  return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
}
