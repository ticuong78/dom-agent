import type { ContextTree } from "@core/context";
import type { DiffPoint } from "./DiffPoint";

export type DiffLens = "context" | "node" | "inner";

export type DiffRule = {
  lens: DiffLens;
};

export interface DiffViewer {
  highlight(reference: ContextTree, target: ContextTree): DiffPoint[];
}
