import { CheerioAdapter } from "@adapters/atom";
import { SHA256HashAdapter } from "@adapters/hash";
import { UUIDAdapter } from "@adapters/id";
import { HTMLToContextConverter } from "@implementation/converter/HTMLToContextConverter";
import { TreeHierarchyDiffViewer } from "@implementation/diff/TreeHierarchyDiffViewer";
import { HTMLDiffReporter } from "@implementation/diff/HTMLDiffReporter";

const html = `
<!DOCTYPE html>
<html lang="en">
<body>
  <div class="generation_one" id="grandparents" data-generation="1">
    This is your grand parents family tree

    <!-- subtree đổi → DELETED + có thể kèm SUBTREE_CHANGED (cùng nodeSig) -->
    <div class="generation_two gen_a" id="parents-side" data-generation="2">
      This is your parents side

      <!-- subtree (text con) đổi → DELETED + SUBTREE_CHANGED -->
      <div class="generation_three gen_z" data-generation="3">
        <p>This is your generation</p>
      </div>

      <!-- biến mất → DELETED -->
      <div class="uncle" data-role="uncle">
        <span>Uncle Bob</span>
        <span>Uncle Tim</span>
      </div>

      <!-- vị trí đổi → DELETED ở chỗ cũ, ADDED ở chỗ mới -->
      <div class="cousin" data-role="cousin">
        <p>Cousin Anna</p>
      </div>
    </div>

    <!-- biến mất → DELETED -->
    <aside class="family-note" data-generation="2">
      <p>Some old note about the family</p>
    </aside>
  </div>
</body>
</html>
`;

const htmlV2 = `
<!DOCTYPE html>
<html lang="en">
<body>
  <div class="generation_one" id="grandparents" data-generation="1">
    This is your grandparents family tree

    <!-- attrs đổi → ADDED ở phía target (contextSig khác bản cũ) -->
    <div class="generation_two gen_a branch_main" id="parents-side" data-generation="2">
      This is your parents side

      <!-- text con đổi → ADDED ở phía target -->
      <div class="generation_three gen_z" data-generation="3">
        <p>This is your generation now</p>
      </div>

      <!-- uncle không có ở target → DELETED ở phía reference -->

      <!-- ADDED: aunt mới -->
      <div class="aunt" data-role="aunt">
        <span>Aunt Sarah</span>
      </div>
    </div>

    <!-- ADDED: thay thế cho aside cũ (aside thì DELETED) -->
    <section class="family-news" data-generation="2">
      <h2>Family updates 2026</h2>
    </section>

    <!-- nhánh mới hoàn toàn → ADDED -->
    <div class="extended-family" data-generation="2">
      <!-- cousin ở vị trí mới → ADDED ở chỗ này, vị trí cũ là DELETED -->
      <div class="cousin" data-role="cousin">
        <p>Cousin Anna</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

const cheerioAdapter = new CheerioAdapter();
const rootNodeV1 = cheerioAdapter.parse(html);
const rootNodeV2 = cheerioAdapter.parse(htmlV2);

if (!rootNodeV1 || !rootNodeV2) throw new Error("Roots are empty.");

const converter = new HTMLToContextConverter(
  new SHA256HashAdapter(),
  new UUIDAdapter(),
);

const treeV1 = converter.convert(rootNodeV1);
const treeV2 = converter.convert(rootNodeV2);

const diffViewer = new TreeHierarchyDiffViewer();

const diffPoints = diffViewer.highlight(treeV1!, treeV2!);

const diffReporter = new HTMLDiffReporter();

// console.dir(diffPoints);
diffReporter.report(diffPoints);
