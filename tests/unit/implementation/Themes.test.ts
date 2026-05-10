import { describe, expect, it } from "vitest";
import { DiffPoint, DiffReport } from "@core/diff";
import { DashboardLikeTheme, DeepSpaceTheme } from "@implementation/theme";
import { createNode } from "../helpers";

describe("HTML report themes", () => {
  it("DashboardLikeTheme renders summary counts, diff cards, and empty state", () => {
    const node = createNode({
      id: "target",
      tagName: "button",
      attributes: { id: "buy" },
      directText: "Buy",
    });
    const theme = new DashboardLikeTheme();

    const withDiffs = theme.render(
      new DiffReport([
        new DiffPoint("ADDED", null, node),
        new DiffPoint("TEXT_CHANGED", node, node, null, null, 1),
      ], "dashboard-report"),
    );
    const empty = theme.render(new DiffReport([], "empty-dashboard"));

    expect(withDiffs).toContain("<title>DOM Agent");
    expect(withDiffs).toContain("dashboard-report");
    expect(withDiffs).toContain("Total Changes <strong>2</strong>");
    expect(withDiffs).toContain("ADDED");
    expect(withDiffs).toContain("TEXT CHANGED");
    expect(withDiffs).toContain("&lt;button id=\"buy\"&gt;");
    expect(empty).toContain("empty-dashboard");
    expect(empty).toContain("No differences found");
  });

  it("DeepSpaceTheme renders summary counts, diff cards, and empty state", () => {
    const parentA = createNode({ id: "parent-a", tagName: "main" });
    const parentB = createNode({ id: "parent-b", tagName: "aside" });
    const node = createNode({
      id: "reference",
      tagName: "section",
      attributes: { "data-key": "hero" },
    });
    const theme = new DeepSpaceTheme();

    const withDiffs = theme.render(
      new DiffReport([
        new DiffPoint("REPARENTED", node, node, parentA, parentB),
        new DiffPoint("DELETED", node, null),
      ], "space-report"),
    );
    const empty = theme.render(new DiffReport([], "empty-space"));

    expect(withDiffs).toContain("space-report Report");
    expect(withDiffs).toContain("REPARENTED");
    expect(withDiffs).toContain("DELETED");
    expect(withDiffs).toContain("&lt;section data-key=\"hero\"&gt;");
    expect(withDiffs).toContain("FROM");
    expect(withDiffs).toContain("TO");
    expect(empty).toContain("empty-space Report");
    expect(empty).toContain("No differences found");
  });

  it("DashboardLikeTheme renders fallback card, text, attribute, and parent branches", () => {
    const longText = "x".repeat(95);
    const nodeWithoutAttrs = createNode({
      id: "plain",
      tagName: "p",
      directText: longText,
      parentTagName: "article",
      parentAttributeCount: 1,
      parentDepth: 2,
    });
    const html = new DashboardLikeTheme().render(
      new DiffReport([
        new DiffPoint("CUSTOM_EMPTY", null, null),
        new DiffPoint("TEXT_CHANGED", nodeWithoutAttrs, nodeWithoutAttrs),
        new DiffPoint("REPARENTED", nodeWithoutAttrs, nodeWithoutAttrs, null, null),
      ], "dashboard-fallbacks"),
    );

    expect(html).toContain("dashboard-fallbacks");
    expect(html).toContain("no node metadata");
    expect(html).toContain("Not present in this snapshot.");
    expect(html).toContain(`${"x".repeat(90)}...`);
    expect(html).toContain("Attribute Analytic (0)");
    expect(html).toContain("tag:article attrs:1 depth:2");
    expect(html).toContain("Reference Parent");
    expect(html).toContain("Target Parent");
  });

  it("DashboardLikeTheme renders singular counts and all non-zero legend branches", () => {
    const node = createNode({
      id: "short-text",
      tagName: "span",
      directText: "short",
    });
    const noTextNode = createNode({
      id: "no-text",
      tagName: "div",
    });
    const oneDiffHtml = new DashboardLikeTheme().render(
      new DiffReport([new DiffPoint("ADDED", null, node)], "dashboard-one"),
    );
    const allTypesHtml = new DashboardLikeTheme().render(
      new DiffReport([
        new DiffPoint("ADDED", null, node),
        new DiffPoint("DELETED", noTextNode, null),
        new DiffPoint("REORDERED", node, node),
        new DiffPoint("REPARENTED", node, node),
        new DiffPoint("TAG_CHANGED", node, node),
        new DiffPoint("ATTRIBUTE_CHANGED", node, node),
        new DiffPoint("TEXT_CHANGED", node, node),
        new DiffPoint("GROWN", node, node),
        new DiffPoint("SHRUNK", node, node),
        new DiffPoint("DEPTH_CHANGED", node, node),
      ], "dashboard-all-types"),
    );

    expect(oneDiffHtml).toContain("1 surfaced item</div>");
    expect(oneDiffHtml).toContain('"short"');
    expect(allTypesHtml).toContain("dashboard-all-types");
    expect(allTypesHtml).toContain("GROWN");
    expect(allTypesHtml).toContain("SHRUNK");
    expect(allTypesHtml).toContain("DEPTH CHANGED");
  });

  it("DeepSpaceTheme renders fallback card, text, attribute, and parent branches", () => {
    const longText = "y".repeat(65);
    const nodeWithoutAttrs = createNode({
      id: "plain-space",
      tagName: "p",
      directText: longText,
      parentTagName: "section",
      parentAttributeCount: 0,
      parentDepth: 1,
    });
    const html = new DeepSpaceTheme().render(
      new DiffReport([
        new DiffPoint("CUSTOM_EMPTY", null, null),
        new DiffPoint("TEXT_CHANGED", nodeWithoutAttrs, nodeWithoutAttrs),
        new DiffPoint("REPARENTED", nodeWithoutAttrs, nodeWithoutAttrs, null, null),
      ], "space-fallbacks"),
    );

    expect(html).toContain("space-fallbacks Report");
    expect(html).toContain("not present in DeepSpaceTheme snapshot");
    expect(html).toContain(`${"y".repeat(60)}...`);
    expect(html).toContain("attributeAnalytic (0)");
    expect(html).toContain("tag:section attrs:0 depth:1");
    expect(html).toContain("Reference Parent");
    expect(html).toContain("Target Parent");
  });

  it("DeepSpaceTheme renders singular counts, deltas, and short text previews", () => {
    const node = createNode({
      id: "short-space",
      tagName: "span",
      directText: "brief",
    });
    const html = new DeepSpaceTheme().render(
      new DiffReport([
        new DiffPoint("GROWN", node, node, null, null, 2),
      ], "space-one"),
    );

    expect(html).toContain("space-one Report");
    expect(html).toContain("1 change detected");
    expect(html).toContain("GROWN");
    expect(html).toContain("2");
    expect(html).toContain('"brief"');
  });
});
