export const KINDS = 8;
export const BEATS = 3;
export const LEAST = 4;
export const MOST = 7;
export const GAPS_MOST = 2;
export const WAGONS = KINDS * BEATS;

const LETTERS = "abcdefghijklmnopqrstuvwx";
const CODE = new RegExp(`^T[a-xA-X]{${LEAST},${MOST}}$`);

export const wagonOf = (kind, beats = 1) => kind * BEATS + (beats - 1);
export const kindOf = (wagon) => Math.floor(wagon / BEATS);
export const beatsOf = (wagon) => (wagon % BEATS) + 1;

export function makeTrain(wagons, gaps = []) {
  return Object.freeze({ wagons: Object.freeze([...wagons]), hidden: Object.freeze(wagons.map((_, at) => gaps.includes(at))) });
}

export const gapsOf = (train) => train.hidden.flatMap((hidden, at) => (hidden ? [at] : []));

export function periodOf(wagons) {
  for (let period = 1; period <= Math.floor(wagons.length / 2); period += 1) {
    if (wagons.every((wagon, at) => at < period || wagon === wagons[at - period])) return period;
  }
  return null;
}

export function encodeTrain(train) {
  return `T${train.wagons.map((wagon, at) => (train.hidden[at] ? LETTERS[wagon].toUpperCase() : LETTERS[wagon])).join("")}`;
}

export function decodeTrain(code) {
  if (typeof code !== "string" || !CODE.test(code)) return null;
  const letters = [...code.slice(1)];
  const gaps = letters.flatMap((letter, at) => (letter === letter.toUpperCase() ? [at] : []));
  if (gaps.length === letters.length) return null;
  return makeTrain(letters.map((letter) => LETTERS.indexOf(letter.toLowerCase())), gaps);
}

export function answersOf(train, most = Infinity) {
  const gaps = gapsOf(train);
  const wagons = [...train.wagons];
  const found = [];
  const fill = (depth) => {
    if (found.length >= most) return;
    if (depth === gaps.length) {
      if (periodOf(wagons) !== null) found.push(gaps.map((at) => wagons[at]));
      return;
    }
    for (let wagon = 0; wagon < WAGONS; wagon += 1) {
      wagons[gaps[depth]] = wagon;
      fill(depth + 1);
    }
  };
  fill(0);
  return found;
}

export function checkTrain(train) {
  const count = train?.wagons?.length ?? 0;
  if (count < LEAST || count > MOST) return "length";
  const gaps = gapsOf(train).length;
  if (gaps < 1 || gaps > GAPS_MOST) return "gaps";
  if (periodOf(train.wagons) === null) return "pattern";
  return answersOf(train, 2).length === 1 ? null : "answers";
}
