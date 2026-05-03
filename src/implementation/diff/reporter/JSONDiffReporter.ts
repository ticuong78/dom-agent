import * as fs from "fs";
import * as path from "path";
import type { DiffPoint } from "@core/diff";
import type { DiffReporter } from "@core/diff/DiffReporter";
import type { ContextNode } from "@core/context";

type NodeSnapshot = {
  id: string;
  tagName: string;
  attributeAnalytic: Record<string, { actualValue: string; numberOfValues: number; totalLength: number }>;
  attributeCount: number;
  directText: string;
  directTextHash: string;
  // positioning
  depth: number;
  nthChild: number;
  siblingCount: number;
  // inner
  height: number;
  childCount: number;
  // parent surface
  parentTagName: string | null;
  parentAttributeCount: number | null;
  parentDepth: number | null;
  // relational ids (pointers flattened to ids)
  parentId: string | null;
  childIds: string[];
};

type DiffPointSerialized = {
  type: string;
  referenceNode: NodeSnapshot | null;
  targetNode: NodeSnapshot | null;
  referenceParentNode?: NodeSnapshot | null;
  targetParentNode?: NodeSnapshot | null;
  delta?: number;
};

type DiffReport = {
  generatedAt: string;
  totalDiffs: number;
  diffs: DiffPointSerialized[];
};

export class JSONDiffReporter implements DiffReporter {
  public report(
    diffPoints: DiffPoint<string>[],
    outputPath: string = "report/diff.json",
  ): void {
    JSONDiffReporter.report(diffPoints, outputPath);
  }

  public static report(
    diffPoints: DiffPoint<string>[],
    outputPath: string = "report/diff.json",
  ): void {
    const json = JSONDiffReporter._serialize(diffPoints);
    const dir = path.dirname(outputPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, json, "utf-8");
    console.log(`[dom-agent] report written -> ${outputPath}`);
  }

  private static _serialize(diffPoints: DiffPoint<string>[]): string {
    const payload: DiffReport = {
      generatedAt: new Date().toISOString(),
      totalDiffs: diffPoints.length,
      diffs: diffPoints.map((p) => JSONDiffReporter._serializePoint(p)),
    };

    return JSON.stringify(payload, null, 2);
  }

  private static _serializePoint(
    point: DiffPoint<string>,
  ): DiffPointSerialized {
    const serialized: DiffPointSerialized = {
      type: point.type,
      referenceNode: JSONDiffReporter._snapshotNode(point.referenceNode),
      targetNode: JSONDiffReporter._snapshotNode(point.targetNode),
    };

    if (point.referenceParentNode !== undefined) {
      serialized.referenceParentNode = JSONDiffReporter._snapshotNode(
        point.referenceParentNode,
      );
    }

    if (point.targetParentNode !== undefined) {
      serialized.targetParentNode = JSONDiffReporter._snapshotNode(
        point.targetParentNode,
      );
    }

    if (point.delta !== undefined) {
      serialized.delta = point.delta;
    }

    return serialized;
  }

  /**
   * Flattens a ContextNode into a plain object with no circular
   * references. Pointers (parent, siblings, children) become ids.
   */
  private static _snapshotNode(
    node: ContextNode | null | undefined,
  ): NodeSnapshot | null {
    if (!node) return null;

    return {
      id: node.id,
      tagName: node.tagName,
      attributeAnalytic: node.attributeAnalytic,
      attributeCount: node.attributeCount,
      directText: node.directText,
      directTextHash: node.directTextHash,
      depth: node.depth,
      nthChild: node.nthChild,
      siblingCount: node.siblingCount,
      height: node.height,
      childCount: node.childCount,
      parentTagName: node.parentTagName,
      parentAttributeCount: node.parentAttributeCount,
      parentDepth: node.parentDepth,
      parentId: node.parent?.id ?? null,
      childIds: node.children.map((c) => c.id),
    };
  }
}
