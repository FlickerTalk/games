import manifest from "../module.json";
import { defineBumperRing } from "./element.js";

defineBumperRing(manifest.components[0], manifest.version);
