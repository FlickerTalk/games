import ROWS_LOOK from "./rows.css";
import { TABLETOP_STYLE, canvasBoard } from "../../../kit/src/tabletop/board.js";
import { Seeds, storeKey } from "./keeper.js";
import { ROWS_STYLE } from "./layout.js";
import { mountRows } from "./rows.js";
import { createScene } from "./scene.js";
import { ART, themeFor } from "./theme.js";
import { sideMark } from "./tiles.js";

export { storeKey };

export const STYLE = `${TABLETOP_STYLE}\n${ROWS_STYLE}\n${ROWS_LOOK}\n.ftg{--hue-side-0:${ART.sides[0].body};--hue-side-1:${ART.sides[1].body}}`;

export const MARKS = [sideMark(0), sideMark(1)];

function coreOf(host) {
  let node = host;
  while (node && !(node.tagName && node.tagName.includes("-"))) node = node.parentNode;
  return node?.ft ?? globalThis.ft;
}

export const board = {
  mount(host, first) {
    let ctx = first;
    let scene = null;
    let told = "";
    const seeds = new Seeds(coreOf(host)?.store);
    const key = () => storeKey(ctx.view?.me ?? "", ctx.view?.index ?? 0);
    const paint = () => {
      rows.paint({ t: ctx.t, phase: ctx.state.phase, mySide: ctx.mySide, score: ctx.state.score, said: ctx.state.said, word: scene.word(), canUndo: scene.canUndo(), canSay: scene.canSay(), canPass: scene.canPass() });
      const text = seeds.lost ? ctx.t("seedLost") : "";
      if (text && text !== told) ctx.notify?.(text);
      told = text;
    };
    const surface = canvasBoard({ theme: themeFor, scene: (context, hooks) => (scene = createScene(context, { ...hooks, changed: () => paint() })) }).mount(host, first);
    const rows = mountRows(host, {
      act(name) {
        scene[name]();
        surface.update(ctx);
        paint();
      },
    });
    const settle = async () => {
      await seeds.settle(ctx, key());
      if (seeds.lost) paint();
    };
    paint();
    seeds.recall(key()).then(settle);
    return {
      update(next) {
        if (next.view?.index !== ctx.view?.index) seeds.forget();
        ctx = next;
        surface.update(next);
        paint();
        settle();
      },
      destroy() {
        rows.destroy();
        surface.destroy();
      },
    };
  },
};
