import manifest from "../module.json";
import { defineBeepRoute } from "./element.js";

defineBeepRoute(manifest.components[0], manifest.version);
