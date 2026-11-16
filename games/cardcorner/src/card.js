export const suitOf = (one) => Math.floor(one / 13);
export const rankOf = (one) => one % 13;
export const card = (suit, rank) => suit * 13 + rank;
export const isRed = (one) => suitOf(one) === 1 || suitOf(one) === 2;
export const sameKind = (one, two) => rankOf(one) === rankOf(two) && isRed(one) === isRed(two);
export const warValue = (one) => (rankOf(one) + 12) % 13;
export const pointsOf = (one) => Math.min(10, rankOf(one) + 1);
export const bySuit = (a, b) => suitOf(a) - suitOf(b) || rankOf(a) - rankOf(b);
export const byRank = (a, b) => rankOf(a) - rankOf(b) || suitOf(a) - suitOf(b);
