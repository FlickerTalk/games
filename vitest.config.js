// One test run for the kit and every game. The plugins run in a browser frame, so the tests get a
// DOM; a stylesheet is imported as text, as esbuild does when it builds a game (`loader: text`).
// Vite would turn a module whose name ends in `.css` into a stylesheet, so it is read under
// another name. Ionic's components are registered first, as the app lends them to the frame
// (kit/test/ionic.js).
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
