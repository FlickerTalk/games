import { TABLETOP_STYLE, canvasBoard } from "../../../kit/src/tabletop/board.js";
import { Fleet, storeKey } from "./keeper.js";
import { sideMark } from "./pieces.js";
import { createScene } from "./scene.js";
import { ART, themeFor } from "./theme.js";

export const STYLE = `${TABLETOP_STYLE}\n.ftg{--hue-side-0:${ART.boats[0].body};--hue-side-1:${ART.boats[1].body}}\n.ftg .ftt-layer>button[data-act]:not(:disabled):active{border-radius:50%;background:color-mix(in srgb,var(--ink) 16%,transparent)}`;

export const MARKS = [sideMark(0), sideMark(1)];

const surface = canvasBoard({ theme: themeFor, scene: createScene });

function coreOf(host) {
  let node = host;
  while (node && !(node.tagName && node.tagName.includes("-"))) node = node.parentNode;
  return node?.ft ?? globalThis.ft;
}

// the fleet and its salt stay in the plugin's store until the reveal, read back once the board is up
export const board = {
  mount(host, first) {
    const fleet = new Fleet(coreOf(host)?.store);
    let latest = { ...first, fleet };
    let gone = false;
    const mounted = surface.mount(host, latest);
    fleet.recall(storeKey(first.view?.me ?? "")).then(() => gone || mounted.update(latest));
    return {
      update(next) {
        latest = { ...next, fleet };
        mounted.update(latest);
      },
      destroy() {
        gone = true;
        mounted.destroy();
      },
    };
  },
};
