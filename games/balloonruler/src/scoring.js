export const GREAT = 0.04;
export const GOOD = 0.12;
export const REACH = 0.05;

const BONUS = [2, 1, 0];

export const starsOf = (error) => (error <= GREAT ? 3 : error <= GOOD ? 2 : 1);

export const isFar = (error) => error > GOOD;

export const hitsReal = (error) => error <= REACH;

export const pointsOf = (error, size) => starsOf(error) + (hitsReal(error) ? (BONUS[size] ?? 0) : 0);

export function scoreOf(numbers, guesses) {
  let score = 0;
  guesses.slice(0, numbers.length).forEach((guess, at) => (score += pointsOf(Math.abs(guess - numbers[at].share), numbers[at].size)));
  return score;
}
