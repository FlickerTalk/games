import { COLUMNS, landing } from "./rules.js";

const ALL = Array.from({ length: COLUMNS }, (_, column) => column);

export const openColumns = (cells, canPlay) => (canPlay ? ALL.filter((column) => landing(cells, column) >= 0) : []);

export const pick = (cells, canPlay, column) => (openColumns(cells, canPlay).includes(column) ? column : null);
