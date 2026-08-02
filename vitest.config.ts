import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
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
        test: {
          name: "integration",
          include: ["./src/__tests__/**/*.{test,spec}.ts"],
          exclude: ["./__tests__/**/*.{test,spec}.ts"],
        },
      },
      {
        test: {
          name: "e2e",
          include: ["./__tests__/**/*.{test,spec}.ts"],
        },
      },
    ],
    exclude: [...configDefaults.exclude, "./src/_playground.ts"],
  },
});
