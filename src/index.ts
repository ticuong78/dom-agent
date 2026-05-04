import { CheerioAdapter } from "@adapters/atom";
import { SHA256HashAdapter } from "@adapters/hash";
import { UUIDAdapter } from "@adapters/id";
import { HTMLToContextConverter } from "@implementation/converter/HTMLToContextConverter";
import { CompareRule } from "@core/compare/CompareRule";
import {
  RuleBasedComparer,
  type GroupKeyFn,
} from "@implementation/compare/RuleBasedComparer";
import { TreeHierarchyDiffViewer } from "@implementation/diff/viewer/TreeHierarchyDiffViewer";
import { NodeMutationDiffViewer } from "@implementation/diff/viewer/NodeMutationDiffViewer";
import { SubtreeShapeDiffViewer } from "@implementation/diff/viewer/SubtreeShapeDiffViewer";
import { HTMLDiffReporter } from "@implementation/diff/reporter/HTMLDiffReporter";
import { JSONDiffReporter } from "@implementation/diff/reporter/JSONDiffReporter";
import { DiffReport } from "@core/diff";
import { DeepSpaceTheme } from "@implementation/theme/DeepSpaceTheme";
import { DashboardLikeTheme } from "@implementation/theme/DashboardLikeTheme";

// ─── V1: Reference snapshot ─────────────────────────────────
const html = `
<!DOCTYPE html>
<html lang="en">
<body>
  <div class="root" id="app" data-v="1">
    Version One

    <!-- TEXT_CHANGED: text will change -->
    <header class="site-header" data-s="header">Welcome Old</header>

    <!-- SHRUNK: will lose a child -->
    <nav class="site-nav" data-s="nav">
      <a class="lnk-home" data-to="home">Home</a>
      <a class="lnk-about" data-to="about">About</a>
      <a class="lnk-help" data-to="help">Help</a>
    </nav>

    <!-- REORDERED: children will swap -->
    <div class="columns" data-s="cols">
      <div class="col-left" data-pos="left">Left Panel</div>
      <div class="col-right" data-pos="right">Right Panel</div>
    </div>

    <!-- TRAP: uncle bob — must NOT match aunt sarah -->
    <div class="uncle" data-role="uncle">
      <span class="tag" data-who="bob">Uncle Bob</span>
    </div>

    <!-- TAG_CHANGED: div will become section -->
    <div class="bulletin" data-s="bulletin">
      <p class="note" data-id="n1">Note one</p>
    </div>

    <!-- ATTRIBUTE_CHANGED: will gain data-verified -->
    <div class="profile" data-s="profile">
      <p class="bio" data-id="bio">My bio</p>
    </div>

    <!-- REPARENTED: will move into a new wrapper -->
    <div class="widget" data-role="widget">
      <p class="w-body" data-id="w1">Widget body</p>
    </div>

    <!-- GROWN: will gain more images -->
    <div class="photos" data-s="photos">
      <img class="ph-one" data-id="p1" />
    </div>

    <!-- DEPTH_CHANGED: subtree will deepen without gaining direct children -->
    <div class="forum" data-s="forum">
      <div class="msg-a" data-id="ma">Message A</div>
      <div class="msg-b" data-id="mb">Message B</div>
    </div>

    <!-- DELETED: will be removed -->
    <footer class="old-footer" data-s="footer">
      <p class="bye" data-id="bye">Goodbye</p>
    </footer>
  </div>
</body>
</html>
`;

// ─── V2: Target snapshot ─────────────────────────────────────
const htmlV2 = `
<!DOCTYPE html>
<html lang="en">
<body>
  <div class="root" id="app" data-v="1">
    Version Two

    <!-- TEXT_CHANGED -->
    <header class="site-header" data-s="header">Welcome New</header>

    <!-- SHRUNK: lost lnk-help -->
    <nav class="site-nav" data-s="nav">
      <a class="lnk-home" data-to="home">Home</a>
      <a class="lnk-about" data-to="about">About</a>
    </nav>

    <!-- REORDERED: children swapped -->
    <div class="columns" data-s="cols">
      <div class="col-right" data-pos="right">Right Panel</div>
      <div class="col-left" data-pos="left">Left Panel</div>
    </div>

    <!-- TRAP: aunt sarah — different attribute values -->
    <div class="aunt" data-role="aunt">
      <span class="tag" data-who="sarah">Aunt Sarah</span>
    </div>

    <!-- TAG_CHANGED: section instead of div, same attributes -->
    <section class="bulletin" data-s="bulletin">
      <p class="note" data-id="n1">Note one</p>
    </section>

    <!-- ATTRIBUTE_CHANGED: gained data-verified -->
    <div class="profile" data-s="profile" data-verified="true">
      <p class="bio" data-id="bio">My bio</p>
    </div>

    <!-- REPARENTED: widget now inside dock wrapper -->
    <div class="widget-dock" data-s="dock">
      <div class="widget" data-role="widget">
        <p class="w-body" data-id="w1">Widget body</p>
      </div>
    </div>

    <!-- GROWN: more images -->
    <div class="photos" data-s="photos">
      <img class="ph-one" data-id="p1" />
      <img class="ph-two" data-id="p2" />
      <img class="ph-three" data-id="p3" />
    </div>

    <!-- DEPTH_CHANGED: msg-a now has a nested reply, forum keeps 2 direct children -->
    <div class="forum" data-s="forum">
      <div class="msg-a" data-id="ma">
        Message A
        <div class="reply" data-id="r1">Reply to A</div>
      </div>
      <div class="msg-b" data-id="mb">Message B</div>
    </div>

    <!-- ADDED: entirely new -->
    <section class="promo" data-s="promo">
      <h2 class="promo-title" data-id="pt1">Special Offer</h2>
    </section>
  </div>
</body>
</html>
`;

// ─── Setup ───────────────────────────────────────────────────
const cheerioAdapter = new CheerioAdapter();
const rootNodeV1 = cheerioAdapter.parse(html);
const rootNodeV2 = cheerioAdapter.parse(htmlV2);
if (!rootNodeV1 || !rootNodeV2) throw new Error("Roots are empty.");

const converter = new HTMLToContextConverter(
  new UUIDAdapter(),
  new SHA256HashAdapter(),
);
const treeV1 = converter.convert(rootNodeV1);
const treeV2 = converter.convert(rootNodeV2);

// ─── Comparers (each viewer gets the comparer it needs) ─────

// Hierarchy: tagName + values_match, NO depth constraint
// → allows matching reparented nodes that changed depth
const hierarchyRule = new CompareRule([
  { attType: "tagName", matchType: "match", logicType: "and" },
  { attType: "attributeAnalytic", matchType: "values_match", logicType: "and" },
]);
const hierarchyComparer = new RuleBasedComparer(hierarchyRule);

// Mutation: depth + values_match, grouped by depth (NO tagName)
// → allows matching nodes that changed tag (TAG_CHANGED)
// → values_match only checks shared keys, so added/removed attrs still pair (ATTRIBUTE_CHANGED)
const groupByDepth: GroupKeyFn = (node) => String(node.depth);
const mutationRule = new CompareRule([
  { attType: "depth", matchType: "equal", logicType: "and" },
  { attType: "attributeAnalytic", matchType: "values_match", logicType: "and" },
]);
const mutationComparer = new RuleBasedComparer(mutationRule, groupByDepth);

// Shape: tagName + values_match
// → standard structural comparison for subtree changes
const shapeRule = new CompareRule([
  { attType: "tagName", matchType: "match", logicType: "and" },
  { attType: "attributeAnalytic", matchType: "values_match", logicType: "and" },
]);
const shapeComparer = new RuleBasedComparer(shapeRule);

// ─── Viewers ─────────────────────────────────────────────────
const hierarchyViewer = new TreeHierarchyDiffViewer(hierarchyComparer);
const mutationViewer = new NodeMutationDiffViewer(mutationComparer);
const shapeViewer = new SubtreeShapeDiffViewer(shapeComparer);

// ─── Run & Report ────────────────────────────────────────────
console.log("=== TreeHierarchyDiffViewer ===");
console.log("  (expects: REPARENTED, REORDERED, ADDED, DELETED)");
const hierarchyDiffs = hierarchyViewer.highlight(treeV1!, treeV2!);
for (const d of hierarchyDiffs) {
  const ref = d.referenceNode;
  const tar = d.targetNode;
  const label = (n: typeof ref) =>
    n
      ? `${n.tagName}.${n.attributeAnalytic?.class?.actualValue ?? "?"}`
      : "---";
  console.log(`  ${d.type}: ${label(ref)} -> ${label(tar)}`);
}

console.log("\n=== NodeMutationDiffViewer ===");
console.log(
  "  (expects: TAG_CHANGED, ATTRIBUTE_CHANGED, TEXT_CHANGED, ADDED, DELETED)",
);
const mutationDiffs = mutationViewer.highlight(treeV1!, treeV2!);
for (const d of mutationDiffs) {
  const ref = d.referenceNode;
  const tar = d.targetNode;
  const label = (n: typeof ref) =>
    n
      ? `${n.tagName}.${n.attributeAnalytic?.class?.actualValue ?? "?"}`
      : "---";
  console.log(`  ${d.type}: ${label(ref)} -> ${label(tar)}`);
}

console.log("\n=== SubtreeShapeDiffViewer ===");
console.log("  (expects: GROWN, SHRUNK, DEPTH_CHANGED, ADDED, DELETED)");
const shapeDiffs = shapeViewer.highlight(treeV1!, treeV2!);
for (const d of shapeDiffs) {
  const ref = d.referenceNode;
  const tar = d.targetNode;
  const label = (n: typeof ref) =>
    n
      ? `${n.tagName}.${n.attributeAnalytic?.class?.actualValue ?? "?"}`
      : "---";
  console.log(
    `  ${d.type} (delta=${d.delta ?? 0}): ${label(ref)} -> ${label(tar)}`,
  );
}

// ─── DiffReport ──────────────────────────────────────────────

const shapeDiffReport = new DiffReport(shapeDiffs, "Shape Diff");
const mutationDiffReport = new DiffReport(mutationDiffs, "Mutation Diff");
const hierarchyDiffReport = new DiffReport(hierarchyDiffs, "Hierarchy Diff");

// ─── Reports ─────────────────────────────────────────────────
const deepSpace = new DashboardLikeTheme();

// ─── Reports ─────────────────────────────────────────────────
const hTMLDiffReporter = new HTMLDiffReporter(deepSpace);
const jSONDiffReporter = new JSONDiffReporter();

hTMLDiffReporter.report(hierarchyDiffReport, "report/hierarchyDiffs.html");
hTMLDiffReporter.report(mutationDiffReport, "report/mutationDiffs.html");
hTMLDiffReporter.report(shapeDiffReport, "report/shapeDiffs.html");
jSONDiffReporter.report(hierarchyDiffReport, "report/hierarchyDiffs.json");
jSONDiffReporter.report(mutationDiffReport, "report/mutationDiffs.json");
jSONDiffReporter.report(shapeDiffReport, "report/shapeDiffs.json");
