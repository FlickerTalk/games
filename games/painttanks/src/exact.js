const DECIMALS = 1e6;

const rounded = (value) => Math.round(value * DECIMALS) / DECIMALS;

export const wave = (radians) => rounded(Math.sin(radians));
export const sine = (degrees) => rounded(Math.sin((degrees * Math.PI) / 180));
export const cosine = (degrees) => rounded(Math.cos((degrees * Math.PI) / 180));
export const distance = (dx, dy) => Math.sqrt(dx * dx + dy * dy);
