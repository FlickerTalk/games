import manifest from "../module.json";
import { definePaddlePop } from "./element.js";

definePaddlePop(manifest.components[0], manifest.version);
