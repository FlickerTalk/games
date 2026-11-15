import { isPlain } from "./curve.js";

export const GIFT_EVERY = Object.freeze([2, 3, 4]);

const isLook = (look) => typeof look === "string" && look.length > 0 && look.length <= 64;
const isGap = (wins) => Number.isInteger(wins) && wins >= 2 && wins <= 4;

export function checkGifts(gifts) {
  const { looks, free, every = GIFT_EVERY } = isPlain(gifts) ? gifts : {};
  if (!Array.isArray(looks) || !looks.length || !looks.every(isLook) || new Set(looks).size !== looks.length) {
    throw new TypeError("a game's gifts need looks: a list of distinct names of 1 to 64 characters");
  }
  if (!Number.isInteger(free) || free < 1 || free > looks.length) throw new TypeError("a game's gifts need free: how many looks are owned from the start, at least 1");
  if (!Array.isArray(every) || !every.length || !every.every(isGap)) throw new TypeError("gifts come every 2 to 4 wins: every is a list of whole numbers from 2 to 4");
  return Object.freeze({ looks: Object.freeze([...looks]), free, every: Object.freeze([...every]) });
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
