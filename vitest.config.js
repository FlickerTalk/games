// One test run for the kit and every game. The plugins run in a browser frame, so the tests get a
// DOM; a stylesheet is imported as text, as esbuild does when it builds a game.
export default {
  test: {
    environment: "happy-dom",
    include: ["kit/**/*.test.js", "games/*/test/**/*.test.js"],
  },
  plugins: [
    {
      name: "css-as-text",
      enforce: "pre",
      transform(code, id) {
        if (id.endsWith(".css")) return { code: `export default ${JSON.stringify(code)};`, map: null };
      },
    },
  ],
};
