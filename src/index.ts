// --- Core ---
export * from "@core/interface";
export * from "@core/plain";
export * from "@core/context";
export * from "@core/crypto";
export * from "@core/converter";
export * from "@core/compare";
export * from "@core/diff";

// --- Adapters ---
export * from "@adapters/atom";
export * from "@adapters/hash";
export * from "@adapters/id";

// --- Implementation ---
export * from "@implementation/converter";
export * from "@implementation/compare";
export * from "@implementation/diff/viewer";

export type DiffViewerTypes =
  | "mutation"
  | "hierarchy"
  | "composition"
  | "subshape";
