import { land } from "./land/index.js";
import { sea } from "./sea/index.js";
import { space } from "./space/index.js";

export const WORLD_ART = Object.freeze({ space, sea, land });

export const artOf = (world) => WORLD_ART[world] ?? WORLD_ART.space;
