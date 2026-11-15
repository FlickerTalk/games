import { BOXES, LINES, boxesOf, count, sidesOf } from "./rules.js";

const SIDES = Array.from({ length: BOXES * BOXES }, (_, box) => sidesOf(box));
const NEXT_TO = Array.from({ length: LINES }, (_, line) => boxesOf(line));
const BOX = 10;

function open(lines, box) {
  let left = 0;
  for (const line of SIDES[box]) if (!lines[line]) left += 1;
  return left;
}

const closes = (lines, line) => NEXT_TO[line].some((box) => open(lines, box) === 1);
const handsOver = (lines, line) => NEXT_TO[line].some((box) => open(lines, box) === 2);

function takeable(lines) {
  const drawn = [...lines];
  let taken = 0;
  for (let more = true; more; ) {
    more = false;
    for (let box = 0; box < SIDES.length; box += 1) {
      if (open(drawn, box) !== 1) continue;
      const last = SIDES[box].find((line) => !drawn[line]);
      taken += NEXT_TO[last].filter((one) => open(drawn, one) === 1).length;
      drawn[last] = true;
      more = true;
    }
  }
  return taken;
}

// drawing the far side of a chain's last two boxes hands both over, so the other side opens the next chain
function declines(lines) {
  const found = [];
  for (let box = 0; box < SIDES.length; box += 1) {
    if (open(lines, box) !== 1) continue;
    const shared = SIDES[box].find((line) => !lines[line]);
    const next = NEXT_TO[shared].find((one) => one !== box);
    if (next === undefined || open(lines, next) !== 2) continue;
    const far = SIDES[next].find((line) => !lines[line] && line !== shared);
    const beyond = NEXT_TO[far].find((one) => one !== next);
    if (beyond === undefined || open(lines, beyond) >= 3) found.push(far);
  }
  return found;
}

function moves(state) {
  const free = [];
  for (let line = 0; line < LINES; line += 1) if (!state.lines[line]) free.push(line);
  const closing = free.filter((line) => closes(state.lines, line));
  if (closing.length) return [...closing, ...declines(state.lines)];
  const safe = free.filter((line) => !handsOver(state.lines, line));
  if (safe.length) return safe;
  const given = free.map((line) => takeable(state.lines.map((drawn, one) => drawn || one === line)));
  const fewest = Math.min(...given);
  return free.filter((line, at) => given[at] === fewest);
}

function score(state, side) {
  const [first, second] = count(state.boxes);
  const ahead = side === 0 ? first - second : second - first;
  const now = takeable(state.lines);
  return BOX * (ahead + (state.next === side ? now : -now));
}

export const robot = {
  moves,
  score,
  depth: 8,
  budgetMs: 250,
};
