import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(import.meta.dirname, "..", "..", "src", "canvas");
const COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(|\b(?:white|black|gr[ae]y|silver|red|blue|green|yellow|orange|purple|pink|brown|transparent)\b(?=["'`])/i;
const COLOUR_MATHS = ["theme.js", "tone.js"];

describe("the canvas kit's colours", () => {
  it("come from the host's theme: no drawing module names a colour", () => {
    const files = readdirSync(SRC).filter((file) => file.endsWith(".js") && !COLOUR_MATHS.includes(file));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) expect(COLOUR.exec(readFileSync(join(SRC, file), "utf8"))?.[0] ?? null, file).toBeNull();
  });
});
