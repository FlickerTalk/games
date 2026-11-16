import manifest from "../module.json";
import { defineShardSplitter } from "./element.js";

defineShardSplitter(manifest.components[0], manifest.version);
