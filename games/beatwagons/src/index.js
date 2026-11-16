import manifest from "../module.json";
import { defineBeatWagons } from "./element.js";

defineBeatWagons(manifest.components[0], manifest.version);
