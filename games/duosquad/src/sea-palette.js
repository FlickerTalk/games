const INK = "#243247";
const WATER = { ink: INK, shaft: "#8CE2D5", dust: "#A9DFE8" };

export const SEA = {
  ink: INK,
  white: "#FFFDF5",
  bodies: [["#FFCF3F", "#FFE584", "#E89A2D"], ["#55C9C0", "#A9F4E6", "#278E91"]],
  dimmed: ["#596575", "#AAB6C4", "#354758"],
  glass: "#A9DFE8",
  glassDark: "#367B91",
  steel: "#AAB6C4",
  steelDark: "#596575",
  amber: "#F5B84C",
  coral: "#F26B5E",
  cyan: "#59F0DC",
  cyanDark: "#24AEB4",
  violet: "#9D82E8",
  violetDark: "#584A91",
  deep: "#050F1C",
  monsterLight: "#3C5B67",
  monsterDark: "#111E31",
  monsterGreen: "#173B35",
  monsterPurple: "#2B2145",
  monsterRust: "#57352F",
  bone: "#C5B997",
  boneDark: "#776F63",
  zones: {
    reef: { ...WATER, sky: "#164552", mid: "#103747", low: "#091E2D", floor: "#050F1C", reef: "#20594F", reefDark: "#123B39", rust: "#57352F", violet: "#584A91", bone: "#776F63" },
    kelp: { ...WATER, sky: "#103747", mid: "#091E2D", low: "#050F1C", floor: "#050F1C", wall: "#050F1C", kelp: "#285343", kelpLight: "#477B57", wreck: "#665F59", wreckLight: "#948373", window: "#367B91", sail: "#103747" },
    trench: { ...WATER, shaft: "#59F0DC", sky: "#091E2D", mid: "#091E2D", low: "#050F1C", floor: "#050F1C", vent: "#384B55", rust: "#57352F", steam: "#AAB6C4", glow: "#59F0DC", glowDark: "#24AEB4" },
  },
};
