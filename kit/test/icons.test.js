// The interface's icons are Ionicons (the app's own set), never emoji: each one copied from the
// `ionicons` package (MIT) into the kit, drawn inline in `currentColor`. Emoji stay only in what
// goes to the chat (the summary). Every state of the shell and every game's board is drawn and
// scanned for emoji; the stylesheets too; and the hint shows the same mail icon as the app's game
// bar, in each of the 21 languages.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ICONS, icon } from "../src/icons.js";
import { KIT_TEXTS, LANGUAGES } from "../src/i18n.js";
import { defineGame } from "../src/index.js";
import { fakeCore, phones, settle, toy, within } from "./helpers.js";

const root = join(import.meta.dirname, "..", "..");
const EMOJI = /\p{Extended_Pictographic}/u;
const emojiIn = (text) => [...new Set([...text].filter((char) => EMOJI.test(char)))].join("");

defineGame({
  ...toy,
  tag: "ft-toy-icons",
  app: "1.0.0",
  sides: ['<svg class="toy-x"></svg>', '<svg class="toy-o"></svg>'],
  board: {
    mount(host, ctx) {
      const paint = (next) => {
        host.innerHTML = ["p", "w", "d"].map((move) => `<button data-move="${move}" ${next.canPlay ? "" : "disabled"}>${move}</button>`).join("");
        host.onclick = (event) => event.target.dataset.move && next.play(event.target.dataset.move);
      };
      paint(ctx);
      return { update: paint };
    },
  },
  texts: { en: { name: "Toy" } },
});

const tick = () => settle([...document.querySelectorAll("ft-toy-icons")].map((element) => element.table));
async function phone(core, opening = {}) {
  const element = document.createElement("ft-toy-icons");
  element.ft = core.ft;
  document.body.append(element);
  await core.open(opening);
  await tick();
  return element;
}
const press = async (element, selector) => {
  within(element, selector).click();
  await tick();
};

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = "";
});
afterEach(() => vi.useRealTimers());

describe("the icons", () => {
  it("are Ionicons, each exactly as the ionicons package draws it", () => {
    expect(Object.keys(ICONS).length).toBeGreaterThan(20);
    for (const [name, inner] of Object.entries(ICONS)) {
      const file = readFileSync(join(root, "node_modules", "ionicons", "dist", "svg", `${name}.svg`), "utf8");
      expect(inner, name).toBe(file.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, ""));
    }
  });

  it("draw inline in the text's colour, hidden from screen readers (the button says what it does)", () => {
    const drawn = icon("mail-outline");
    expect(drawn).toMatch(/^<svg class="ftg-ico" viewBox="0 0 512 512" aria-hidden="true" focusable="false">/);
    expect(drawn).not.toContain("http");
    expect(() => icon("no-such-icon")).toThrow("no-such-icon");
    const css = readFileSync(join(root, "kit", "src", "style.css"), "utf8");
    expect(css).toMatch(/\.ftg-ico \{[^}]*width: 1\.2em;[^}]*height: 1\.2em;[^}]*fill: currentColor;/s);
  });
});

describe("no emoji in the interface", () => {
  it("in any state of the shell", async () => {
    const seen = [];
    // The page and the question over it (Ionic's alert, in the frame's body).
    const look = (element, state) => seen.push([state, emojiIn(element.innerHTML + (element.alert?.innerHTML ?? ""))]);
    const { a, b } = phones();
    b.closed = true;
    const one = await phone(a);
    look(one, "list, empty");
    await press(one, '[data-kit="new"]');
    look(one, "waiting");
    await vi.advanceTimersByTimeAsync(8_100);
    look(one, "nobody answered");
    b.closed = false;
    const two = await phone(b);
    await press(one, '[data-kit="retry"]');
    await tick();
    look(one, "in a game");
    look(two, "in a game, the other side");
    await press(one, '[data-kit="resign"]');
    look(one, "asking to resign");
    await press(one, '[data-kit="yes"]');
    await tick();
    look(one, "result");
    look(two, "result, the other side");
    for (const key of ["unreachable", "left", "busy", "denied", "update", "badMove", "full", "invalid", "abandoned", "tooLong", "error", "needsChat"]) {
      one.table.notice = { key, vars: { version: "2.0.0" } };
      one.paint();
      look(one, `notice ${key}`);
    }
    one.table.notice = null;
    one.table.prompt = { kind: "invited", id: "x" };
    one.table.record = { ...one.table.record, fork: ["p"] };
    one.paint();
    look(one, "a prompt and a fork");
    await press(two, '[data-kit="back"]');
    look(two, "list, with a match");
    await press(two, '[data-kit="delete"]');
    look(two, "asking to delete");
    const away = await phone(fakeCore(), { live: false });
    look(away, "outside a conversation");
    expect(seen.filter(([, found]) => found)).toEqual([]);
  });

  it("on any game's board, nor in any stylesheet", async () => {
    for (const game of readdirSync(join(root, "games"))) {
      const css = readFileSync(join(root, "games", game, "src", "board.css"), "utf8");
      expect(emojiIn(css), `${game}/board.css`).toBe("");
      const source = readFileSync(join(root, "games", game, "src", "board.js"), "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
      expect(emojiIn(source), `${game}/board.js`).toBe("");
    }
    expect(emojiIn(readFileSync(join(root, "kit", "src", "style.css"), "utf8"))).toBe("");
    const shell = readFileSync(join(root, "kit", "src", "shell.js"), "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
    expect(emojiIn(shell)).toBe("");
  });

  it("but the hint shows the game bar's mail icon, in every language", async () => {
    for (const lang of LANGUAGES) {
      expect(KIT_TEXTS[lang].howToInvite, lang).toContain("{invite}");
      expect(emojiIn(KIT_TEXTS[lang].howToInvite), lang).toBe("");
      document.body.innerHTML = "";
      const { a, b } = phones();
      b.closed = true;
      const one = await phone(a, { lang });
      await press(one, '[data-kit="new"]');
      const hint = one.querySelector(".ftg-toast");
      expect(hint.querySelector("svg.ftg-ico"), lang).not.toBeNull();
      const mail = document.createElement("p");
      mail.innerHTML = icon("mail-outline");
      expect(hint.innerHTML, lang).toContain(mail.innerHTML);
      expect(hint.textContent, lang).not.toContain("{invite}");
    }
  });
});
