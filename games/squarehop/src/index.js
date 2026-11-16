import manifest from "../module.json";
import { defineSquareHop } from "./element.js";

defineSquareHop(manifest.components[0], manifest.version);
