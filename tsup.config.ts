import { defineConfig } from "tsup";

export default defineConfig({
  format: ["cjs", "esm"],
  entry: [
    "src/**/*.ts",
    "!src/**/*.{test,spec}.ts",
    "!__tests__/**/*.{test,spec}.ts",
  ],
  dts: true,
  shims: true,
  skipNodeModulesBundle: true,
  clean: true,
});
