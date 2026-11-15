import manifest from "../module.json";
import { defineLiveGame } from "../../../src/live/index.js";

defineLiveGame({
  id: "fixturelive",
  gv: 1,
  tag: manifest.components[0],
  app: manifest.version,
  aspect: 1,
  check: (state) => (state && Number.isFinite(state.d) ? { d: state.d } : null),
  texts: { en: { name: "Live fixture", soloIntro: "Alone.", liveIntro: "Together." } },
  stage: { mount: ({ view }) => ((view.innerHTML = "<canvas></canvas>"), { frame() {}, reset() {} }) },
});
