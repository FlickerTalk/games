import { FONT, softDay, softStage, themeFromTokens } from "../../../kit/src/canvas/index.js";

function freeze(value) {
  if (value && typeof value === "object") {
    for (const inner of Object.values(value)) freeze(inner);
    Object.freeze(value);
  }
  return value;
}

const INK = "#243247";

const TOYS = {
  ink: INK, white: "#FFFDF5", cream: "#FFF7DF",
  player: "#FFCF3F", playerLight: "#FFE584", playerDark: "#E89A2D",
  rival: "#8D7DE8", rivalLight: "#B8ACF5", rivalDark: "#6356B8",
  glass: "#A9DFE8", tire: "#2C3444", hub: "#AAB6C4", wood: "#C98F58", woodLight: "#EDC58E", trunk: "#9B6747",
  coral: "#F26B5E", coralDark: "#C84E49", azure: "#4F9BE8", azureDark: "#3673B5", mint: "#55B987", mintDark: "#348565",
  grassLight: "#B8E184", orange: "#F39A45", rose: "#F478A5", roseLight: "#FFC2D5", roseDark: "#C6537D",
  tree: "#3D8E56", treeLight: "#6DBC60", cactus: "#4E9B68", rock: "#B68B68", snow: "#EAF5F5", pine: "#3F786E", pineLight: "#6FA297",
  meadow: "#83C96B", desert: "#EBCB83", foam: "#F5FFFF", ice: "#C5E7EE", iceDark: "#82B8CA",
  duck: "#FFD94F", duckDark: "#E5A837", sail: "#FFF3D6", submarine: "#6B9E9F", submarineDark: "#447778",
  bubble: "#D8F7F4", pearl: "#FFF1F4", kelp: "#2F8870", kelpLight: "#67B77C", reef: "#F08A73", reefLight: "#FFC46B",
  tin: "#B9C9D2", parachute: "#F49AB5", cork: "#FFB15C", gold: "#FFC846", star: "#FF9E45",
  sea: "#3185B1", spray: "#9BE1E8",
};

const DAYTIME = {
  meadow: { sky: "#BEE8F0", distant: "#9BD5C4", ground: "#83C96B", groundDark: "#4E9F58", water: "#55B9D6", waterLight: "#9BE1E8", waterDark: "#3185B1", cloud: "#FFFDF5", floor: "#E7C77F", floorDark: "#B99558" },
  desert: { sky: "#F7DFB9", distant: "#E6B979", ground: "#EBCB83", groundDark: "#D3A75D", water: "#55B9D6", waterLight: "#9BE1E8", waterDark: "#3185B1", cloud: "#FFFDF5", floor: "#E7C77F", floorDark: "#B99558" },
  snow: { sky: "#D8EAF2", distant: "#C8E0E5", ground: "#EAF5F5", groundDark: "#C8E0E5", water: "#3185B1", waterLight: "#9BE1E8", waterDark: "#447778", cloud: "#FFFDF5", floor: "#C8E0E5", floorDark: "#B99558" },
};

const DEEPER = ["ground", "groundDark", "floor", "floorDark"];

function stageFor(dark) {
  return Object.fromEntries(
    Object.entries(DAYTIME).map(([name, colours]) => {
      const soft = { ...softStage(colours, { dark }) };
      for (const key of DEEPER) soft[key] = softDay(colours[key], { dark, deeper: 0.06 });
      return [name, soft];
    }),
  );
}

function artFor(ui) {
  const { player, coral, azure, mint, rival, rivalLight } = TOYS;
  return {
    ...TOYS,
    confetti: [player, coral, azure, mint, rival],
    present: { box: rival, lid: rivalLight, ribbon: player, ink: INK },
    scenery: stageFor(ui.dark),
    rim: ui.rim,
  };
}

const made = new Map();

export function themeFor(tokens, mode = {}) {
  const ui = themeFromTokens(tokens, mode);
  const key = JSON.stringify(ui);
  if (!made.has(key)) made.set(key, freeze({ font: FONT, ui, art: artFor(ui) }));
  return made.get(key);
}

export const THEME = themeFor(null);
