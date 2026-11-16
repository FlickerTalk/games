import { randomOf } from "../../../kit/src/canvas/random.js";
import { defineProgress, roundSeconds } from "../../../kit/src/progress/index.js";
import { TWISTS } from "./arena.js";

export const PLANES = Object.freeze(["propeller", "biplane", "jet", "seaplane", "stunt", "paper"]);
export const HELICOPTERS = Object.freeze(["bubble", "tandem", "rescue", "saucer"]);
export const LOOKS = Object.freeze({ plane: PLANES, helicopter: HELICOPTERS });
export const COLOURS = Object.freeze(["sunny", "coral", "ocean", "mint", "lilac"]);
export const SKIES = Object.freeze(["morning", "desert", "snow", "night", "sea"]);
export const FLICK_COLOUR = "lilac";

export const PROGRESS = defineProgress({
  timed: true,
  curve: {
    skill: { first: 0.3, step: 0.11, limit: 0.85, eased: -0.2 },
    twists: { first: 0, step: 1, limit: TWISTS.length - 1 },
  },
  stars: { two: 2, three: 3 },
  gifts: {
    looks: ["propeller", "biplane", "jet", "bubble", "tandem", "seaplane", "rescue", "stunt", "saucer", "paper"],
    free: 5,
    kinds: LOOKS,
  },
});

const TOGETHER_LEVEL = 5;

export const familyOf = (craft) => (HELICOPTERS.includes(craft) ? "helicopter" : "plane");

const RIVALS = Object.freeze({ plane: ["jet", "propeller"], helicopter: ["tandem", "bubble"] });

export function rivalCraft(mine) {
  const [usual, other] = RIVALS[familyOf(mine)];
  return mine === usual ? other : usual;
}

export const colourFor = (mine) => (mine === FLICK_COLOUR ? COLOURS[0] : FLICK_COLOUR);

export function settingsFor(record, mode, seed) {
  const together = mode === "friend";
  const round = PROGRESS.nextRound(together ? { ...PROGRESS.fresh(), level: TOGETHER_LEVEL } : record);
  const place = together ? SKIES[Math.floor(randomOf(`${seed}/place`)() * SKIES.length)] : SKIES[(round.level - 1) % SKIES.length];
  return { level: round.level, eased: round.eased, skill: round.values.skill, twists: round.values.twists, seconds: together ? roundSeconds(TOGETHER_LEVEL) : round.seconds, place };
}

export const wonRound = (mine, theirs) => mine > theirs;
