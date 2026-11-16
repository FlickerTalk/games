import { describe, expect, it } from "vitest";
import { syncButtons } from "../../src/tabletop/buttons.js";

const spec = (key, extra = {}) => ({ key, box: { x: key / 10, y: 0.25, w: 0.125, h: 0.125 }, label: `Square ${key}`, disabled: false, data: { cell: key }, ...extra });
const buttons = (layer) => [...layer.querySelectorAll("button")];

describe("the buttons over a canvas board", () => {
  it("lays one labelled button over each target, placed in shares of the board so it follows any size", () => {
    const layer = document.createElement("div");
    syncButtons(layer, [spec(1), spec(3, { disabled: true, data: { cell: 3, drag: true, mark: "can last" } })]);
    const [one, three] = buttons(layer);
    expect(one.type).toBe("button");
    expect(one.getAttribute("aria-label")).toBe("Square 1");
    expect(one.dataset.key).toBe("1");
    expect(one.dataset.cell).toBe("1");
    expect(one.style.left).toBe("10%");
    expect(one.style.top).toBe("25%");
    expect(one.style.width).toBe("12.5%");
    expect(one.style.height).toBe("12.5%");
    expect(one.disabled).toBe(false);
    expect(three.disabled).toBe(true);
    expect(three.dataset.drag).toBe("");
    expect(three.dataset.mark).toBe("can last");
  });

  it("patches the same buttons on the next change, so focus and a finger on one are kept", () => {
    const layer = document.createElement("div");
    syncButtons(layer, [spec(1, { data: { cell: 1, drag: true } }), spec(2), spec(3)]);
    const [one, two] = buttons(layer);
    syncButtons(layer, [spec(2, { label: "Square two", disabled: true }), spec(1, { data: { cell: 1, drag: false } }), spec(4)]);
    const now = buttons(layer);
    expect(now.map((button) => button.dataset.key)).toEqual(["2", "1", "4"]);
    expect(now[0]).toBe(two);
    expect(now[1]).toBe(one);
    expect(two.getAttribute("aria-label")).toBe("Square two");
    expect(two.disabled).toBe(true);
    expect(one.hasAttribute("data-drag")).toBe(false);
  });

  it("leaves alone what else the layer holds", () => {
    const layer = document.createElement("div");
    const ghosts = document.createElement("span");
    layer.append(ghosts);
    syncButtons(layer, [spec(5)]);
    syncButtons(layer, []);
    expect(layer.firstElementChild).toBe(ghosts);
    expect(buttons(layer)).toHaveLength(0);
  });
});
