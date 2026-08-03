import { fileURLToPath } from "url";
import { defineConfig, configDefaults } from "vitest/config";

// "@": ["src/*"],
// "@types": ["src/types.ts"],
// "@utils": ["src/utils.ts"],
// "@selector": ["src/selector.ts"],
// "@convert/*": ["src/convert/*"],
// "@compare/*": ["src/compare/*"],
// "@diffs/*": ["src/diffs/*"],
// "@interface/*": ["src/interface/*"]

export default defineConfig({
  resolve: {
    alias: {
      // "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@types": fileURLToPath(new URL("./src/types.ts", import.meta.url)),
      "@utils": fileURLToPath(new URL("./src/utils.ts", import.meta.url)),
      "@selector": fileURLToPath(new URL("./src/selector.ts", import.meta.url)),
      "@convert": fileURLToPath(new URL("./src/convert", import.meta.url)),
      "@compare": fileURLToPath(new URL("./src/compare", import.meta.url)),
      "@diffs": fileURLToPath(new URL("./src/diffs", import.meta.url)),
      "@interface": fileURLToPath(new URL("./src/interface", import.meta.url)),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["./src/**/__tests__/**/*.{test,spec}.ts"], // include all test from subfolder counting from src folder
          exclude: [
            "./src/__tests__/**/*.{test,spec}.ts",
            "./__tests__/**/*.{test,spec}.ts",
          ], // ignore src-level tests functions
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["./src/__tests__/**/*.{test,spec}.ts"],
          exclude: ["./__tests__/**/*.{test,spec}.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "e2e",
          include: ["./__tests__/**/*.{test,spec}.ts"],
        },
      },
    ],
    exclude: [...configDefaults.exclude, "./src/_playground.ts"],
  },
});
