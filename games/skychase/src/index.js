import manifest from "../module.json";
import { defineSkyChase } from "./element.js";

defineSkyChase(manifest.components[0], manifest.version);
