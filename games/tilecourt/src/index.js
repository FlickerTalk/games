import manifest from "../module.json";
import { defineTileCourt } from "./element.js";

defineTileCourt(manifest.components[0], manifest.version);
