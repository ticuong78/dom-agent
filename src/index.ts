import { ContextConverter } from "./convert/convert";
import { CheerioParser } from "./convert/parse";
import type { DiffPoint } from "./diffs/points";
import {
  CompositeDiffViewer,
  NodeMutationDiffViewer,
  SubtreeShapeDiffViewer,
  TreeHierarchyDiffViewer,
  type StandardDiffType,
} from "./diffs/viewers";
import type { Profile } from "./types";

export type { SelectorSuggestion } from "./selector";
export type DiffViewerTypes = "mutation" | "hierarchy" | "shape";

export function diff({
  first,
  second,
  types = ["hierarchy", "mutation", "shape"],
  profiles = [], // when choosing selector, must be very specific on what you choose
  // config
}: {
  first: string;
  second: string;
  types?: DiffViewerTypes[];
  profiles?: Profile[];
}): DiffPoint<StandardDiffType>[] {
  const converter = new ContextConverter();

  const firstContextTree = converter.convert(
    // parses html content and mark what needed to be ignored by the comparing process
    CheerioParser.parse(first, profiles),
  );
  const secondContextTree = converter.convert(CheerioParser.parse(second));

  const compositeDiffViewer = new CompositeDiffViewer<StandardDiffType>();

  if (types.includes("hierarchy"))
    compositeDiffViewer.registerViewers(new TreeHierarchyDiffViewer());
  if (types.includes("mutation"))
    compositeDiffViewer.registerViewers(new NodeMutationDiffViewer());
  if (types.includes("shape"))
    compositeDiffViewer.registerViewers(new SubtreeShapeDiffViewer());

  return compositeDiffViewer.highlight(firstContextTree, secondContextTree);
}
