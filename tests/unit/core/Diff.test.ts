import { describe, expect, it } from "vitest";
import { DiffPoint, DiffReport } from "@core/diff";
import { createNode } from "../helpers";

describe("DiffPoint", () => {
  it("serializes reference and target nodes and omits absent optional fields", () => {
    const reference = createNode({ id: "reference", tagName: "p" });
    const target = createNode({ id: "target", tagName: "span" });

    const snapshot = new DiffPoint("TAG_CHANGED", reference, target).serialize();

    expect(snapshot.type).toBe("TAG_CHANGED");
    expect(snapshot.referenceNode?.id).toBe("reference");
    expect(snapshot.targetNode?.id).toBe("target");
    expect(snapshot).not.toHaveProperty("referenceParentNode");
    expect(snapshot).not.toHaveProperty("targetParentNode");
    expect(snapshot).not.toHaveProperty("delta");
  });

  it("serializes additions, deletions, parent nodes, and delta when present", () => {
    const reference = createNode({ id: "reference" });
    const target = createNode({ id: "target" });
    const refParent = createNode({ id: "ref-parent", tagName: "main" });
    const targetParent = createNode({ id: "target-parent", tagName: "section" });

    expect(new DiffPoint("ADDED", null, target).serialize()).toMatchObject({
      type: "ADDED",
      referenceNode: null,
      targetNode: { id: "target" },
    });
    expect(new DiffPoint("DELETED", reference, null).serialize()).toMatchObject({
      type: "DELETED",
      referenceNode: { id: "reference" },
      targetNode: null,
    });
    expect(
      new DiffPoint("REPARENTED", reference, target, refParent, targetParent, 2)
        .serialize(),
    ).toMatchObject({
      type: "REPARENTED",
      referenceParentNode: { id: "ref-parent" },
      targetParentNode: { id: "target-parent" },
      delta: 2,
    });
    expect(
      new DiffPoint("REPARENTED", reference, target, null, null).serialize(),
    ).toMatchObject({
      referenceParentNode: null,
      targetParentNode: null,
    });
  });
});

describe("DiffReport", () => {
  it("counts and serializes diff points with an explicit report name", () => {
    const diffPoints = [
      new DiffPoint("ADDED", null, createNode({ id: "target" })),
      new DiffPoint("DELETED", createNode({ id: "reference" }), null),
    ];
    const report = new DiffReport(diffPoints, "daily-check");

    expect(report.totalDiffs).toBe(2);
    expect(report.reportName).toBe("daily-check");
    expect(report.serialize()).toMatchObject({
      reportName: "daily-check",
      totalDiffs: 2,
      diffPoints: [{ type: "ADDED" }, { type: "DELETED" }],
    });
    expect(typeof report.serialize().reportDate).toBe("string");
  });

  it("leaves the reportName property undefined when no name is passed", () => {
    const report = new DiffReport([]);

    expect(report.totalDiffs).toBe(0);
    expect(report.reportName).toBeUndefined();
    expect(report.serialize().reportName).toBeUndefined();
  });
});
