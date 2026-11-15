const freeze = (list) => Object.freeze(list.map((one) => Object.freeze(one)));

export const PROFILES = freeze([
  { id: "ari", name: "Ari", colour: "#FFCF3F", emblem: "sun" },
  { id: "noa", name: "Noa", colour: "#F26B5E", emblem: "wave" },
  { id: "milo", name: "Milo", colour: "#4F9BE8", emblem: "diamond" },
  { id: "juno", name: "Juno", colour: "#55B987", emblem: "leaf" },
  { id: "kit", name: "Kit", colour: "#B8ACF5", emblem: "moon" },
  { id: "lou", name: "Lou", colour: "#F39A45", emblem: "triangle" },
  { id: "rio", name: "Rio", colour: "#4BC6D7", emblem: "drop" },
  { id: "sam", name: "Sam", colour: "#F39AB5", emblem: "ring" },
  { id: "umi", name: "Umi", colour: "#B8D96A", emblem: "sprout" },
  { id: "val", name: "Val", colour: "#7186E8", emblem: "mountain" },
  { id: "zuri", name: "Zuri", colour: "#FFB15C", emblem: "flower" },
  { id: "nico", name: "Nico", colour: "#E96B8C", emblem: "spark" },
]);

export const FLICK = Object.freeze({ id: "flick", name: "Flick", colour: "#8D7DE8", emblem: "bolt" });

export const HAIRS = freeze([
  { id: "none", group: "none" },
  { id: "long-fringe", group: "long" },
  { id: "ponytail", group: "long" },
  { id: "braids", group: "long" },
  { id: "long-braid", group: "long" },
  { id: "bun", group: "long" },
  { id: "bob", group: "long" },
  { id: "curly-puff", group: "long" },
  { id: "two-puffs", group: "long" },
  { id: "wavy-headband", group: "long" },
  { id: "messy-fringe", group: "short" },
  { id: "short-crop", group: "short" },
  { id: "side-part", group: "short" },
  { id: "spiky", group: "short" },
  { id: "curls", group: "short" },
  { id: "quiff", group: "short" },
  { id: "undercut", group: "short" },
  { id: "cap", group: "short" },
  { id: "mini-twists", group: "short" },
]);

export const HAIR_COLOURS = freeze([
  { id: "ink", colour: "#243247" },
  { id: "chestnut", colour: "#6B4350" },
  { id: "copper", colour: "#C9693F" },
  { id: "golden", colour: "#E9B84C" },
  { id: "cream", colour: "#F5E7C6" },
  { id: "silver", colour: "#AAB6C4" },
]);

export const EXPRESSIONS = Object.freeze(["neutral", "confident", "focused", "happy", "laughing", "surprised", "determined", "dizzy", "sleepy", "cheering", "thinking", "oops"]);

export const POSES = Object.freeze(["idle", "run", "jump", "swing", "kick", "block", "celebrate", "lose"]);

const byId = (list, id) => list.find((one) => one.id === id) ?? list[0];

export const profileOf = (id) => (id === FLICK.id ? FLICK : byId(PROFILES, id));

export const hairOf = (id) => byId(HAIRS, id);

export const colourOf = (id) => byId(HAIR_COLOURS, id);
