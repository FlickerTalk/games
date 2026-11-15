import { checkCurve, isPlain, plateauOf } from "./curve.js";
import { checkGifts, giftSchedule, ownedLooks } from "./gifts.js";
import { freshRecord, loadRecord, readRecord, saveRecord } from "./record.js";
import { awardRound, nextRound } from "./round.js";
import { checkStars } from "./stars.js";

export { EASE_AFTER_LOSSES, HALFWAY_FROM_SECONDS, LONGEST_ROUND_SECONDS, hasHalfway, roundSeconds } from "./duration.js";
export { GIFT_EVERY } from "./gifts.js";
export { PASS_AFTER_LOSSES, PROGRESS_KEY, RECORD_VERSION } from "./record.js";
export { rivalPace } from "./rival.js";
export { starsFor } from "./stars.js";

const FIELDS = ["curve", "timed", "stars", "gifts"];

function checkSpec(declared) {
  if (!isPlain(declared)) throw new TypeError("a game's progress is declared as an object");
  const unknown = Object.keys(declared).find((field) => !FIELDS.includes(field));
  if (unknown) throw new TypeError(`a game's progress has no field "${unknown}": it takes ${FIELDS.join(", ")}`);
  const { curve = {}, timed = false, stars, gifts } = declared;
  if (typeof timed !== "boolean") throw new TypeError("a game's progress says timed: true or false");
  return Object.freeze({
    curve: checkCurve(curve),
    timed,
    stars: stars == null ? null : checkStars(stars),
    gifts: gifts == null ? null : checkGifts(gifts),
  });
}

export function defineProgress(declared) {
  const spec = checkSpec(declared);
  const owned = (record) => (spec.gifts ? ownedLooks(spec.gifts, readRecord(spec, record).received) : []);
  return Object.freeze({
    spec,
    plateau: plateauOf(spec.curve),
    schedule: Object.freeze(spec.gifts ? giftSchedule(spec.gifts) : []),
    fresh: () => freshRecord(spec),
    read: (raw) => readRecord(spec, raw),
    load: (store) => loadRecord(spec, store),
    save: (store, record) => saveRecord(store, readRecord(spec, record)),
    nextRound: (record) => nextRound(spec, record),
    awardRound: (record, result) => awardRound(spec, record, result),
    owned,
    choose(record, look) {
      const now = readRecord(spec, record);
      return owned(now).includes(look) ? { ...now, chosen: look } : now;
    },
  });
}
