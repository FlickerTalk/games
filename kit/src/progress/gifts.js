import { isPlain } from "./curve.js";

export const GIFT_EVERY = Object.freeze([2, 3, 4]);

const isLook = (look) => typeof look === "string" && look.length > 0 && look.length <= 64;
const isGap = (wins) => Number.isInteger(wins) && wins >= 2 && wins <= 4;

function checkKinds(kinds, looks, free) {
  const lists = isPlain(kinds) ? Object.values(kinds) : [];
  if (!lists.length || !lists.every((list) => Array.isArray(list) && list.length)) {
    throw new TypeError("a game's gifts give kinds as an object of non-empty lists of looks");
  }
  const seen = new Set();
  for (const [kind, list] of Object.entries(kinds)) {
    for (const look of list) {
      if (!looks.includes(look)) throw new TypeError(`the kind "${kind}" names "${look}", which is not one of the looks`);
      if (seen.has(look)) throw new TypeError(`"${look}" is in two kinds`);
      seen.add(look);
    }
    if (!list.some((look) => looks.indexOf(look) < free)) throw new TypeError(`the kind "${kind}" needs a free look among the first ${free}`);
  }
  const missing = looks.find((look) => !seen.has(look));
  if (missing) throw new TypeError(`"${missing}" has no kind`);
  return Object.freeze(Object.fromEntries(Object.entries(kinds).map(([kind, list]) => [kind, Object.freeze([...list])])));
}

export function checkGifts(gifts) {
  const { looks, free, every = GIFT_EVERY, kinds } = isPlain(gifts) ? gifts : {};
  if (!Array.isArray(looks) || !looks.length || !looks.every(isLook) || new Set(looks).size !== looks.length) {
    throw new TypeError("a game's gifts need looks: a list of distinct names of 1 to 64 characters");
  }
  if (!Number.isInteger(free) || free < 1 || free > looks.length) throw new TypeError("a game's gifts need free: how many looks are owned from the start, at least 1");
  if (!Array.isArray(every) || !every.length || !every.every(isGap)) throw new TypeError("gifts come every 2 to 4 wins: every is a list of whole numbers from 2 to 4");
  const checked = { looks: Object.freeze([...looks]), free, every: Object.freeze([...every]) };
  if (kinds !== undefined) checked.kinds = checkKinds(kinds, looks, free);
  return Object.freeze(checked);
}

export function kindOf(gifts, look) {
  if (!gifts?.kinds) return null;
  return Object.keys(gifts.kinds).find((kind) => gifts.kinds[kind].includes(look)) ?? null;
}

export function firstChosen(gifts) {
  if (!gifts) return null;
  if (!gifts.kinds) return gifts.looks[0];
  const isFree = (look) => gifts.looks.indexOf(look) < gifts.free;
  return Object.fromEntries(Object.entries(gifts.kinds).map(([kind, list]) => [kind, list.find(isFree)]));
}

export function withChosen(gifts, chosen, look) {
  return gifts?.kinds ? { ...chosen, [kindOf(gifts, look)]: look } : look;
}

export function giftSchedule({ looks, free, every }) {
  let at = 0;
  return looks.slice(free).map((look, index) => {
    at += every[index % every.length];
    return { look, at };
  });
}

export function ownedLooks({ looks, free }, received) {
  return looks.filter((look, index) => index < free || received.includes(look));
}

export function giftDue(gifts, received, wins) {
  const schedule = giftSchedule(gifts);
  const waiting = schedule.find(({ look }) => !received.includes(look));
  if (!waiting) return null;
  const given = schedule.filter(({ look }) => received.includes(look)).length;
  return wins >= schedule[given].at ? waiting.look : null;
}
