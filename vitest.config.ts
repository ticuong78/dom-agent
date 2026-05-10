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
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/index.ts",
        "src/core/adapters.ts",
        "src/core/atoms.ts",
        "src/core/converters.ts",
        "src/core/molecule.ts",
        "src/core/plain/HTMLAdapter.ts",
        "src/core/plain/HTMLNode.ts",
        "src/core/crypto/HashAdapter.ts",
        "src/core/crypto/IDAdapter.ts",
        "src/core/converter/Converter.ts",
        "src/core/compare/Comparer.ts",
        "src/core/diff/DiffViewer.ts",
        "src/core/diff/DiffReporter.ts",
        "src/core/interface/ISerializable.ts",
        "src/core/renderer/Renderer.ts",
        "src/core/sentinel/NodeSentinel.ts",
        "src/core/sentinel/SentinelResult.ts",
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
