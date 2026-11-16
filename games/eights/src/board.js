import { TABLETOP_STYLE, canvasBoard } from "../../../kit/src/tabletop/board.js";
import { Dealer, storeKey } from "./dealer.js";
import { sideMark } from "./faces.js";
import { createScene } from "./scene.js";
import { ART, themeFor } from "./theme.js";

export const STYLE = `${TABLETOP_STYLE}\n.ftg{--hue-side-0:${ART.sides[0].body};--hue-side-1:${ART.sides[1].body}}\n.ftg .ftt-layer>button[data-suit]{z-index:1}`;

export const MARKS = [sideMark(0), sideMark(1)];

const surface = canvasBoard({ theme: themeFor, scene: createScene });

function coreOf(host) {
  let node = host;
  while (node && !(node.tagName && node.tagName.includes("-"))) node = node.parentNode;
  return node?.ft ?? globalThis.ft;
}

export const board = {
  mount(host, first) {
    const dealer = new Dealer(coreOf(host)?.store);
    const mounted = surface.mount(host, first);
    let latest = first;
    let told = "";
    let gone = false;
    const settle = async () => {
      await dealer.settle(latest);
      const text = dealer.lost ? latest.t("seedLost") : "";
      if (text && text !== told) latest.notify?.(text);
      told = text;
    };
    dealer.recall(storeKey(first.view?.me ?? "", first.view?.index ?? 0)).then(() => gone || settle());
    return {
      update(next) {
        if (next.view?.index !== latest.view?.index) dealer.newRound();
        latest = next;
        mounted.update(next);
        settle();
      },
      destroy() {
        gone = true;
        mounted.destroy();
      },
    };
  },
};
