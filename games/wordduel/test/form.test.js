import { describe, expect, it } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { formHtml } from "../src/form.js";
import { TEXTS } from "../src/texts.js";

const translate = translator(joinTexts(KIT_TEXTS, TEXTS));
const t = (key, vars) => translate("en", key, vars);

function form(options) {
  const node = document.createElement("div");
  node.innerHTML = formHtml({ t, typed: "", ...options });
  return node;
}

describe("the typing form under the board", () => {
  it("asks for the secret word with a suggestion, the field and the button that sets it, and says what it is for", () => {
    const node = form({ phase: "place", typed: "cra", open: true, valid: false, note: t("secretHint") });
    expect(node.querySelector('[data-act="suggest"]').getAttribute("aria-label")).toBe("Suggest a word");
    const field = node.querySelector('input[name="secret"]');
    expect(field.value).toBe("cra");
    expect(field.getAttribute("aria-label")).toBe("Your secret word");
    expect(field.getAttribute("maxlength")).toBe("5");
    expect(node.querySelector('[data-act="commit"]').disabled).toBe(true);
    expect(node.querySelector('[data-act="commit"]').textContent).toContain("Set");
    expect(node.textContent).toContain("Five letters");
    expect(node.querySelector(".fwd-nop")).not.toBeNull();
    expect(form({ phase: "place", typed: "crane", open: true, valid: true }).querySelector('[data-act="commit"]').disabled).toBe(false);
  });

  it("only waits once the word is set", () => {
    const node = form({ phase: "place", committed: true, note: t("secretWait") });
    expect(node.querySelector("input, button")).toBeNull();
    expect(node.textContent).toContain("Waiting for the other side's word");
    expect(node.querySelector(".fwd-nop")).not.toBeNull();
  });

  it("takes a guess while this side may guess, and opens nothing out of turn", () => {
    const open = form({ phase: "guess", typed: "about", canGuess: true, valid: true });
    expect(open.querySelector('input[name="guess"]').getAttribute("aria-label")).toBe("A guess");
    expect(open.querySelector('[data-act="guess"]').disabled).toBe(false);
    expect(open.querySelector('[data-act="guess"]').textContent).toContain("Guess");
    const shut = form({ phase: "guess", canGuess: false, valid: false });
    for (const node of shut.querySelectorAll("input, button")) expect(node.disabled).toBe(true);
  });

  it("shows the other side's word at the end, and writes what it is given as text, never as markup", () => {
    const node = form({ phase: "done", note: t("theirWordWas", { word: "EAGLE" }), reveal: true });
    expect(node.querySelector("input, button")).toBeNull();
    expect(node.querySelector(".fwd-note.reveal").textContent).toBe("Their word was EAGLE");
    expect(form({ phase: "place", typed: '"><b>x', open: true, note: "<i>" }).querySelector("b, i:not(.fwd-nop)")).toBeNull();
  });
});
