import manifest from "../module.json";
import { defineRobotRumble } from "./element.js";

defineRobotRumble(manifest.components[0], manifest.version);
