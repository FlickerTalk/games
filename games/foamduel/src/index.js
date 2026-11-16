import manifest from "../module.json";
import { defineFoamDuel } from "./element.js";

defineFoamDuel(manifest.components[0], manifest.version);
