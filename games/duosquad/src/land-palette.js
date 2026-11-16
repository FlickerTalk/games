const INK = "#243247";
const HEAT = "#FFE0A3";

export const LAND = {
  ink: INK,
  white: "#FFFDF5",
  bodies: [["#F4C95D", "#FFE8A3", "#A86F32"], ["#65D6D0", "#B4F2E9", "#288F96"]],
  dimmed: ["#46566E", "#8293A8", "#263858"],
  metal: "#8293A8",
  metalLight: "#C3CED3",
  shield: "#78D9E8",
  dust: "#F2C88B",
  bronze: "#9B7048",
  bronzeLight: "#C99B62",
  bronzeDark: "#604B3F",
  iron: "#3D4650",
  ironLight: "#68727A",
  sand: "#A85F45",
  enemy: "#FF8A4C",
  enemyLight: "#FFD07A",
  enemyDark: "#6B3F3B",
  enemyCore: "#FFE2A0",
  shot: "#FF9B55",
  shotLight: "#FFE2AE",
  energy: "#F4F7FF",
  zones: {
    canyon: { sky: "#D89A62", light: "#EDBB78", dark: "#B9684F", haze: HEAT, rock: "#B9684F", rockLight: "#D98B63", rockDark: "#754253", ink: INK },
    salt: { sky: "#A99ABD", light: "#D7C4CF", dark: "#675D83", haze: HEAT, ruin: "#826B62", ruinLight: "#B4997B", ink: INK },
    storm: { sky: "#28354B", light: "#3E5062", dark: "#17253A", haze: "#3E5062", glow: "#FF8A4C", glowLight: "#FFD07A", glowDark: "#6B3F3B", ink: INK },
  },
};
