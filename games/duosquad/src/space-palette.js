const INK = "#243247";
const WHITE = "#F4F7F2";
const PLANET = { planet: "#2E4C66", planetLight: "#54768A", ring: "#9CA9B4", asteroid: "#526675", asteroidLight: "#718591", crater: "#46566E", star: WHITE, starDim: "#53627E", starBright: "#EAF2FF", ink: INK };

export const SPACE = {
  ink: INK,
  white: WHITE,
  bodies: [["#F4C95D", "#FFE8A3", "#A86F32"], ["#65D6D0", "#B4F2E9", "#288F96"]],
  dimmed: ["#46566E", "#8293A8", "#17253A"],
  glass: "#698CA6",
  glassDark: "#314C67",
  visor: "#17253A",
  metal: "#8293A8",
  metalLight: "#B7C3CF",
  metalDark: "#46566E",
  enemy: "#8FA7FF",
  enemyLight: "#C4D0FF",
  enemyDark: "#3A4770",
  enemyBody: "#303D56",
  enemyCore: "#B7C6FF",
  shot: "#A9B7FF",
  shotLight: "#E3E8FF",
  shield: "#78D9E8",
  energy: "#F4F7FF",
  zones: {
    orbit: { ...PLANET, sky: "#0A1528", band: "#18304B" },
    nebula: { ...PLANET, sky: "#17132D", band: "#2B2148", cloud: "#2B2148", cloudLight: "#48355F" },
    belt: { ...PLANET, sky: "#0A2026", band: "#173B40" },
  },
};
