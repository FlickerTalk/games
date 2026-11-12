// The smallest game the build can pack: the toy's rules, a board of one button, and the kit.
import manifest from "../module.json";
import { defineGame } from "../../../src/index.js";
import { toy } from "../../toy.js";

defineGame({
  ...toy,
  tag: manifest.components[0],
  app: manifest.version,
  texts: { en: { name: "Fixture" } },
  board: { mount: (host) => ((host.innerHTML = "<button>p</button>"), {}) },
});
