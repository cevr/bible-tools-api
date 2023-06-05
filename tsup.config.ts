import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  sourcemap: true,
  format: ["esm"],
  target: "node18",
  splitting: false,
  external: [/^(?!\.\.?\/)/],
});
