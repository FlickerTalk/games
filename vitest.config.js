import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const TEXT = "\0text:";
const TAIL = ".as-text.js";

export default {
  test: {
    environment: "happy-dom",
    include: ["kit/**/*.test.js", "games/*/test/**/*.test.js", "preview/**/*.test.js"],
    setupFiles: ["kit/test/ionic.js"],
  },
  plugins: [
    {
      name: "css-as-text",
      enforce: "pre",
      resolveId(source, importer) {
        if (source.endsWith(".css") && importer) return TEXT + resolve(dirname(importer), source) + TAIL;
      },
      load(id) {
        if (id.startsWith(TEXT)) return `export default ${JSON.stringify(readFileSync(id.slice(TEXT.length, -TAIL.length), "utf8"))};`;
      },
    },
  ],
};
