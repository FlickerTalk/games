import manifest from "../module.json";
import { definePaintTanks } from "./element.js";

definePaintTanks(manifest.components[0], manifest.version);
