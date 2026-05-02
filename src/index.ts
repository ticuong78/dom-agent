import { CheerioAdapter } from "@adapters/atom";
import { SHA256HashAdapter } from "@adapters/hash";
import { UUIDAdapter } from "@adapters/id";
import { HTMLToContextConverter } from "@implementation/converter/HTMLToContextConverter";
import { ContextDiffViewer } from "@implementation/diff/ContextDiffViewer";
import { HTMLDiffReporter } from "@implementation/diff/HTMLDiffReporter";

const html = `
<!DOCTYPE html>
<html lang="en">
<body>
  <div class="generation_one" id="grandparents" data-generation="1">
    This is your grand parents family tree

    <!-- sẽ bị NODE_CHANGED: thêm class + directText đổi -->
    <div class="generation_two gen_a" id="parents-side" data-generation="2">
      This is your parents side

      <!-- sẽ bị SUBTREE_CHANGED vì <p> bên trong đổi text -->
      <div class="generation_three gen_z" data-generation="3">
        <p>This is your generation</p>
      </div>

      <!-- sẽ bị DELETED hoàn toàn -->
      <div class="uncle" data-role="uncle">
        <span>Uncle Bob</span>
        <span>Uncle Tim</span>
      </div>

      <!-- sẽ bị RELOCATED: sang nhánh khác -->
      <div class="cousin" data-role="cousin">
        <p>Cousin Anna</p>
      </div>
    </div>

    <!-- sẽ bị FULLY_CHANGED: tag + content đều khác -->
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

    <!-- NODE_CHANGED: thêm branch_main, directText giữ nguyên -->
    <div class="generation_two gen_a branch_main" id="parents-side" data-generation="2">
      This is your parents side

      <!-- SUBTREE_CHANGED: <p> đổi text bên trong -->
      <div class="generation_three gen_z" data-generation="3">
        <p>This is your generation now</p>
      </div>

      <!-- uncle bị xóa → DELETED -->

      <!-- ADDED: thêm aunt mới, chưa từng có -->
      <div class="aunt" data-role="aunt">
        <span>Aunt Sarah</span>
      </div>
    </div>

    <!-- FULLY_CHANGED: tag đổi từ aside → section, content khác hoàn toàn -->
    <section class="family-news" data-generation="2">
      <h2>Family updates 2026</h2>
    </section>

    <!-- nhánh mới chứa cousin được RELOCATED vào đây -->
    <div class="extended-family" data-generation="2">
      <!-- RELOCATED: cousin từ parents-side sang đây, nội dung giữ nguyên -->
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

const diffViewer = new ContextDiffViewer();

const diffPoints = diffViewer.highlight(treeV1!, treeV2!);

const diffReporter = new HTMLDiffReporter();

console.dir(diffPoints);
diffReporter.report(diffPoints);
