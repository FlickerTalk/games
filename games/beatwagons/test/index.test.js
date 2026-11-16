// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import manifest from "../module.json";

describe("the package's entry", () => {
  it("defines the element the manifest names", async () => {
    await import("../src/index.js");
    expect(customElements.get(manifest.components[0])).toBeDefined();
    expect(manifest.components).toEqual(["ft-beatwagons"]);
  });
});
