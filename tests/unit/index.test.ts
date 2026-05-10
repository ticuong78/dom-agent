import { describe, expect, it } from "vitest";
import * as publicApi from "../../src";

describe("public API barrel", () => {
  it("exports the main runtime classes and helpers", () => {
    expect(publicApi.CheerioAdapter).toBeTypeOf("function");
    expect(publicApi.SHA256HashAdapter).toBeTypeOf("function");
    expect(publicApi.UUIDAdapter).toBeTypeOf("function");
    expect(publicApi.ContextNode).toBeTypeOf("function");
    expect(publicApi.ContextTree).toBeTypeOf("function");
    expect(publicApi.HTMLToContextConverter).toBeTypeOf("function");
    expect(publicApi.CompareRule).toBeTypeOf("function");
    expect(publicApi.CompareRuleManager).toBeTypeOf("function");
    expect(publicApi.RuleBasedComparer).toBeTypeOf("function");
    expect(publicApi.DiffPoint).toBeTypeOf("function");
    expect(publicApi.DiffReport).toBeTypeOf("function");
    expect(publicApi.NodeMutationDiffViewer).toBeTypeOf("function");
    expect(publicApi.TreeHierarchyDiffViewer).toBeTypeOf("function");
    expect(publicApi.SubtreeShapeDiffViewer).toBeTypeOf("function");
    expect(publicApi.JSONDiffReporter).toBeTypeOf("function");
    expect(publicApi.HTMLDiffReporter).toBeTypeOf("function");
    expect(publicApi.DashboardLikeTheme).toBeTypeOf("function");
    expect(publicApi.DeepSpaceTheme).toBeTypeOf("function");
    expect(publicApi.analyzeAttributes).toBeTypeOf("function");
    expect(publicApi.defaultSignatureCreator).toBeTypeOf("function");
    expect(publicApi.withClassSignatureCreator).toBeTypeOf("function");
  });
});
