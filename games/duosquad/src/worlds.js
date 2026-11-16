import { land } from "./land.js";
import { sea } from "./sea.js";
import { space } from "./space.js";

export const WORLD_ART = Object.freeze({ space, sea, land });

export const artOf = (world) => WORLD_ART[world] ?? WORLD_ART.space;
