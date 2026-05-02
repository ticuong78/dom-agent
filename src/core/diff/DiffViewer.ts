import type { ContextTree } from "@core/context";
import type { DiffPoint, DiffType } from "./DiffPoint";

export type DiffLens = "context" | "node" | "inner";

export type DiffRule = {
  lens: DiffLens;
};

/**
 * DiffViewer — generic theo enum mà viewer này phát ra. Default là DiffType
 * base (ADDED|DELETED). Viewer đặc thù sẽ instantiate với enum mở rộng.
 */
export interface DiffViewer<T extends string = DiffType> {
  highlight(reference: ContextTree, target: ContextTree): DiffPoint<T>[];
}
