import { describe, expect, it } from "vitest";
import { AVATAR_TEXTS } from "../../src/avatars/texts.js";
import { avatarText, colourKey, emblemKey, hairKey } from "../../src/avatars/words.js";

describe("the avatars' words", () => {
  it("are looked up in the language, its base, then English, with their gaps filled", () => {
    expect(avatarText("es", "profile", { name: "Milo", emblem: avatarText("es", emblemKey("diamond")) })).toBe("Milo, diamante");
    expect(avatarText("pt-BR", hairKey("ponytail"))).toBe(AVATAR_TEXTS.pt[hairKey("ponytail")]);
    expect(avatarText("xx", colourKey("copper"))).toBe("Red");
    expect(avatarText(undefined, "done")).toBe("Done");
    expect(avatarText("en", "nothing")).toBe("nothing");
    expect(hairKey("long-fringe")).toBe("hairLongFringe");
    expect(emblemKey("sun")).toBe("emblemSun");
    expect(colourKey("ink")).toBe("colourInk");
  });
});
