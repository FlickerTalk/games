import { BEATS, MOST, checkTrain, makeTrain, wagonOf } from "./train.js";

export const blankBuild = () => ({ wagons: [], hidden: [], beats: 1, tune: null });

export function addWagon(build, kind) {
  if (build.wagons.length >= MOST) return build;
  return { ...build, wagons: [...build.wagons, wagonOf(kind, build.beats)], hidden: [...build.hidden, false] };
}

export function undoWagon(build) {
  if (!build.wagons.length) return build;
  return { ...build, wagons: build.wagons.slice(0, -1), hidden: build.hidden.slice(0, -1) };
}

export const cycleBeats = (build) => ({ ...build, beats: (build.beats % BEATS) + 1 });

export function toggleGap(build, at) {
  if (!Number.isInteger(at) || at < 0 || at >= build.wagons.length) return build;
  return { ...build, hidden: build.hidden.map((hidden, index) => (index === at ? !hidden : hidden)) };
}

export const trainOf = (build) => makeTrain(build.wagons, build.hidden.flatMap((hidden, at) => (hidden ? [at] : [])));

export function checkBuilt(build) {
  const why = checkTrain(trainOf(build));
  return { ok: why === null, why };
}
