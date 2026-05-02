import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      include: [
        "src/core/context/ContextTree.ts",
        "src/implementation/HTMLToContextConverter.ts",
        "src/adapters/atom/CheerioAdapter.ts",
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@core": resolve(__dirname, "src/core"),
      "@adapters": resolve(__dirname, "src/adapters"),
      "@implementation": resolve(__dirname, "src/implementation"),
      "@browser": resolve(__dirname, "src/browser"),
      "@tests": resolve(__dirname, "tests"),
    },
  },
});
