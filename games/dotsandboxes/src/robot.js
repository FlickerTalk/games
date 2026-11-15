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

function moves(state) {
  const free = [];
  for (let line = 0; line < LINES; line += 1) if (!state.lines[line]) free.push(line);
  const closing = free.filter((line) => closes(state.lines, line));
  if (closing.length) return closing;
  const safe = free.filter((line) => !handsOver(state.lines, line));
  if (safe.length) return safe;
  const given = (line) => takeable(state.lines.map((drawn, one) => drawn || one === line));
  return free.map((line) => ({ line, given: given(line) })).sort((one, two) => one.given - two.given).map(({ line }) => line);
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
