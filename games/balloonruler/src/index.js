import manifest from "../module.json";
import { defineBalloonRuler } from "./element.js";

defineBalloonRuler(manifest.components[0], manifest.version);
