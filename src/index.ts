import { CheerioAdapter } from "@adapters/atom";
import { SHA256HashAdapter } from "@adapters/hash";
import { UUIDAdapter } from "@adapters/id";
import { HTMLToContextConverter } from "@implementation/HTMLToContextConverter";

const html = `
<!DOCTYPE html>
<html lang="en">
<body>
  <div class="generation_one" id="grandparents" data-generation="1">
    This is your grand parents family tree
    <div class="generation_two gen_a" id="parents-side" data-generation="2">
      This is your parents side
      <div class="generation_three gen_z" data-generation="3">
        <p>This is your generation</p>
      </div>
    </div>
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
    <div class="generation_two gen_a branch_main" id="parents-side" data-generation="2">
      This is your parents side
      <div class="generation_three gen_z" data-generation="3">
        <p>This is your generation now</p>
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

console.dir(treeV1?.signatures().difference(treeV2?.signatures()!));
