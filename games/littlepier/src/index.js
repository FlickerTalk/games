import manifest from "../module.json";
import { defineLittlePier } from "./element.js";

defineLittlePier(manifest.components[0], manifest.version);
