import { TABLETOP_STYLE, canvasBoard } from "../../../kit/src/tabletop/board.js";
import { sideMark } from "./pieces.js";
import { createRoller } from "./roll.js";
import { createScene } from "./scene.js";
import { ART, themeFor } from "./theme.js";

export const STYLE = `${TABLETOP_STYLE}\n.ftg{--hue-side-0:${ART.sides[0]};--hue-side-1:${ART.sides[1]}}\n.fbg{position:absolute;inset:0}\n.fbg-nop{position:absolute;left:0;top:0;width:4px;height:4px}`;

export const MARKS = [sideMark(0), sideMark(1)];

const table = canvasBoard({ theme: themeFor, scene: createScene });

function coreOf(host) {
  let node = host;
  while (node && !(node.tagName && node.tagName.includes("-"))) node = node.parentNode;
  return node?.ft ?? globalThis.ft;
}

export const board = {
  mount(host, context) {
    const page = host.ownerDocument;
    const frame = page.createElement("div");
    frame.className = "fbg";
    const nop = page.createElement("i");
    nop.className = "fbg-nop";
    nop.setAttribute("aria-hidden", "true");
    host.replaceChildren(frame, nop);
    const drawn = table.mount(frame, context);
    const roller = createRoller(coreOf(host), context);
    return {
      update(next) {
        drawn.update(next);
        roller.update(next);
      },
      destroy() {
        drawn.destroy();
        host.replaceChildren();
      },
    };
  },
};
