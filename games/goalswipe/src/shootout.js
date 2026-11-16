export const EACH = 5;
export const MOST = 4 * EACH;

export const shooterOf = (index) => index % 2;

const shotsOf = (kicks, side) => kicks.filter((_, index) => shooterOf(index) === side);

export const goalsOf = (kicks, side) => shotsOf(kicks, side).filter((kick) => kick.outcome === "goal").length;

function leader(kicks) {
  const [one, two] = [goalsOf(kicks, 0), goalsOf(kicks, 1)];
  return one === two ? null : one > two ? 0 : 1;
}

export function overOf(kicks) {
  const taken = [shotsOf(kicks, 0).length, shotsOf(kicks, 1).length];
  const goals = [goalsOf(kicks, 0), goalsOf(kicks, 1)];
  if (kicks.length < 2 * EACH) {
    for (const side of [0, 1]) {
      if (goals[side] > goals[1 - side] + EACH - taken[1 - side]) return { winner: side };
    }
    return null;
  }
  if (kicks.length % 2) return null;
  const ahead = leader(kicks);
  if (ahead !== null) return { winner: ahead };
  return kicks.length >= MOST ? { winner: null } : null;
}

export function tallyOf(kicks, side) {
  const shots = shotsOf(kicks, side);
  const from = shots.length > EACH ? EACH * Math.floor((shots.length - 1) / EACH) : 0;
  return Array.from({ length: EACH }, (_, at) => {
    const kick = shots[from + at];
    return kick ? (kick.outcome === "goal" ? "goal" : "miss") : null;
  });
}

export function pointsOf(kicks, side) {
  const saves = shotsOf(kicks, 1 - side).filter((kick) => kick.outcome === "saved").length;
  const bonus = shotsOf(kicks, side).filter((kick) => kick.bonus).length;
  return goalsOf(kicks, side) + saves + bonus;
}
