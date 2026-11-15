import { randomBytes } from "./commit.js";
import { newId, newMatch } from "./match.js";
import { robotMove } from "./robot.js";

export function soloMatch(game, bytes = randomBytes) {
  const record = newMatch({ g: game.id, gv: game.gv });
  record.game.b = newId();
  record.game.first = bytes()[0] % 2 === 0 ? record.game.a : record.game.b;
  record.solo = { memory: {} };
  return record;
}

const chance = (bytes = randomBytes) => () => {
  const [one, two, three] = bytes();
  return ((one << 16) | (two << 8) | three) / 2 ** 24;
};

function phoneToMove(table) {
  const record = table.record;
  if (!record?.solo) return false;
  const seen = table.view;
  return seen.phase === "play" && !seen.fork && seen.turn === record.game.b;
}

export function wake(table) {
  table.stop("robot");
  if (!phoneToMove(table)) return;
  const id = table.record.id;
  const pause = table.game.robot.unseen?.(table.view.state) ? table.timing.unseen : table.timing.think;
  table.timers.robot = setTimeout(() => table.run(() => think(table, id)), pause);
}

async function think(table, id) {
  table.timers.robot = null;
  if (table.record?.id !== id || !phoneToMove(table)) return;
  const seen = table.view;
  const next = structuredClone(table.record);
  const move = robotMove(table.game, seen.state, 1 - seen.mySide, next.solo.memory, chance(table.random), { lang: table.lang });
  next.game.moves.push(move);
  next.updated = Date.now();
  if (!(await table.commit(next, "state"))) table.notice ??= { key: "error" };
}
