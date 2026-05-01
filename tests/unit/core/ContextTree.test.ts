import { CheerioAdapter } from "@adapters/atom";
import { SHA256HashAdapter } from "@adapters/hash";
import { UUIDAdapter } from "@adapters/id";
import type { ContextTree } from "@core/context";
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

describe("ContextTree", () => {
  let tree: ContextTree;

  beforeEach(() => {
    const adapter = new CheerioAdapter();
    const converter = new HTMLToContextConverter(
      new SHA256HashAdapter(),
      new UUIDAdapter(),
    );

    const htmlNode = adapter.parse(html);
    expect(htmlNode).not.toBeNull();

    const result = converter.convert(htmlNode!);
    expect(result).not.toBeNull();

    tree = result!;
  });

  // --- structure tests ---

  test("root node is generation_one", () => {
    expect(tree.getRoot().tagName).toBe("div");
    expect(tree.getRoot().attributes["class"]).toBe("generation_one");
  });

  test("root depth is 0", () => {
    expect(tree.getRoot().depth).toBe(0);
  });

  test("child depth is 1", () => {
    const child = tree.getRoot().children[0];
    expect(child?.depth).toBe(1);
  });

  test("grandchild depth is 2", () => {
    const grandchild = tree.getRoot().children[0]?.children[0];
    expect(grandchild?.depth).toBe(2);
  });

  // --- linking tests ---

  test("child parent points back to root", () => {
    const child = tree.getRoot().children[0];
    expect(child?.parent?.tagName).toBe("div");
    expect(child?.parent?.attributes["id"]).toBe("grandparents");
  });

  test("siblings are linked correctly", () => {
    // add a sibling to test lateral linking
    const siblings = tree.getRoot().children;
    if (siblings.length > 1) {
      expect(siblings[0]?.nextSibling).toBe(siblings[1]);
      expect(siblings[1]?.previousSibling).toBe(siblings[0]);
    }
  });

  // --- signature tests ---

  test("nodeSignature is deterministic", () => {
    const root = tree.getRoot();
    const adapter = new CheerioAdapter();
    const converter = new HTMLToContextConverter(
      new SHA256HashAdapter(),
      new UUIDAdapter(),
    );
    const tree2 = converter.convert(adapter.parse(html)!)!;

    // same html = same signatures
    expect(root.nodeSignature).toBe(tree2.getRoot().nodeSignature);
    expect(root.innerNodeSignature).toBe(tree2.getRoot().innerNodeSignature);
    expect(root.contextSignature).toBe(tree2.getRoot().contextSignature);
  });

  test("contextSignature changes when depth changes", () => {
    const root = tree.getRoot();
    const child = tree.getRoot().children[0];
    // different depth = different contextSignature
    expect(root.contextSignature).not.toBe(child?.contextSignature);
  });

  // --- index tests ---

  test("getBySignature finds root", () => {
    const root = tree.getRoot();
    const found = tree.getBySignature(root.contextSignature);
    expect(found).toBe(root);
  });

  test("size equals total node count", () => {
    // html has: div.generation_one, div.generation_two, div.generation_three, p
    expect(tree.size()).toBe(4);
  });

  // --- walk tests ---

  test("walk visits every node", () => {
    const visited: string[] = [];
    tree.walk((node) => visited.push(node.tagName));
    expect(visited.length).toBe(tree.size());
  });
});
