// import { HTMLToContextConverter } from "@implementation/converter/HTMLToContextConverter";
// import { SHA256HashAdapter } from "@adapters/hash/SHA256HashAdapter";
// import { UUIDAdapter } from "@adapters/id/UUIDAdapter";
// import type { HTMLNode } from "@core/plain/HTMLNode";

// // --- helpers ---

// const makeNode = (overrides: Partial<HTMLNode> = {}): HTMLNode => ({
//   type: "tag",
//   tagName: "div",
//   attributes: {},
//   children: [],
//   directText: "",
//   siblingCount: 0,
//   nthChild: 0,
//   ...overrides,
// });

// describe("HTMLToContextConverter", () => {
//   let converter: HTMLToContextConverter;

//   beforeEach(() => {
//     converter = new HTMLToContextConverter(
//       new SHA256HashAdapter(),
//       new UUIDAdapter(),
//     );
//   });

//   // --- convert() ---

//   describe("convert()", () => {
//     test("returns null when node type is not tag", () => {
//       const node = makeNode({ type: "text" });
//       expect(converter.convert(node)).toBeNull();
//     });

//     test("returns ContextTree for valid tag node", () => {
//       const node = makeNode();
//       const result = converter.convert(node);
//       expect(result).not.toBeNull();
//     });

//     test("root node has correct tagName", () => {
//       const node = makeNode({ tagName: "section" });
//       const result = converter.convert(node)!;
//       expect(result.getRoot().tagName).toBe("section");
//     });

//     test("root node has correct attributes", () => {
//       const node = makeNode({ attributes: { class: "foo", id: "bar" } });
//       const result = converter.convert(node)!;
//       expect(result.getRoot().attribute).toEqual({ class: "foo", id: "bar" });
//     });

//     test("root node has correct attributeCount", () => {
//       const node = makeNode({ attributes: { class: "foo", id: "bar" } });
//       const result = converter.convert(node)!;
//       expect(result.getRoot().attributeCount).toBe(2);
//     });
//   });

//   // --- depth ---

//   describe("depth", () => {
//     test("root node has depth 0", () => {
//       const result = converter.convert(makeNode())!;
//       expect(result.getRoot().depth).toBe(0);
//     });

//     test("child node has depth 1", () => {
//       const node = makeNode({ children: [makeNode()] });
//       const result = converter.convert(node)!;
//       expect(result.getRoot().children[0]!.depth).toBe(1);
//     });

//     test("grandchild node has depth 2", () => {
//       const node = makeNode({
//         children: [makeNode({ children: [makeNode()] })],
//       });
//       const result = converter.convert(node)!;
//       expect(result.getRoot().children[0]!.children[0]!.depth).toBe(2);
//     });
//   });

//   // --- height ---

//   describe("height", () => {
//     test("leaf node has height 0", () => {
//       const result = converter.convert(makeNode())!;
//       expect(result.getRoot().height).toBe(0);
//     });

//     test("node with one child level has height 1", () => {
//       const node = makeNode({ children: [makeNode()] });
//       const result = converter.convert(node)!;
//       expect(result.getRoot().height).toBe(1);
//     });

//     test("node with two child levels has height 2", () => {
//       const node = makeNode({
//         children: [makeNode({ children: [makeNode()] })],
//       });
//       const result = converter.convert(node)!;
//       expect(result.getRoot().height).toBe(2);
//     });

//     test("height reflects deepest branch", () => {
//       // left branch: depth 2, right branch: depth 1
//       const node = makeNode({
//         children: [
//           makeNode({ children: [makeNode()] }), // height 2
//           makeNode(), // height 1
//         ],
//       });
//       const result = converter.convert(node)!;
//       expect(result.getRoot().height).toBe(2);
//     });
//   });

//   // --- childCount ---

//   describe("childCount", () => {
//     test("leaf node has childCount 0", () => {
//       const result = converter.convert(makeNode())!;
//       expect(result.getRoot().childCount).toBe(0);
//     });

//     test("node with 3 children has childCount 3", () => {
//       const node = makeNode({
//         children: [makeNode(), makeNode(), makeNode()],
//       });
//       const result = converter.convert(node)!;
//       expect(result.getRoot().childCount).toBe(3);
//     });
//   });

//   // --- sibling linking ---

//   describe("sibling linking", () => {
//     test("only child has null previousSibling and nextSibling", () => {
//       const node = makeNode({ children: [makeNode()] });
//       const result = converter.convert(node)!;
//       const child = result.getRoot().children[0]!;
//       expect(child.previousSibling).toBeNull();
//       expect(child.nextSibling).toBeNull();
//     });

//     test("first child has null previousSibling", () => {
//       const node = makeNode({ children: [makeNode(), makeNode()] });
//       const result = converter.convert(node)!;
//       expect(result.getRoot().children[0]!.previousSibling).toBeNull();
//     });

//     test("last child has null nextSibling", () => {
//       const node = makeNode({ children: [makeNode(), makeNode()] });
//       const result = converter.convert(node)!;
//       const children = result.getRoot().children;
//       expect(children[children.length - 1]!.nextSibling).toBeNull();
//     });

//     test("middle child is linked correctly", () => {
//       const node = makeNode({
//         children: [makeNode(), makeNode(), makeNode()],
//       });
//       const result = converter.convert(node)!;
//       const [first, middle, last] = result.getRoot().children;
//       expect(middle!.previousSibling).toBe(first);
//       expect(middle!.nextSibling).toBe(last);
//     });
//   });

//   // --- parent linking ---

//   describe("parent linking", () => {
//     test("root node has null parent", () => {
//       const result = converter.convert(makeNode())!;
//       expect(result.getRoot().parent).toBeNull();
//     });

//     test("root node has null parentSignature", () => {
//       const result = converter.convert(makeNode())!;
//       expect(result.getRoot().parentSignature).toBeNull();
//     });

//     test("child parent points to root", () => {
//       const node = makeNode({ children: [makeNode()] });
//       const result = converter.convert(node)!;
//       const root = result.getRoot();
//       expect(root.children[0]!.parent).toBe(root);
//     });

//     test("child parentSignature matches parent nodeSignature", () => {
//       const node = makeNode({ children: [makeNode()] });
//       const result = converter.convert(node)!;
//       const root = result.getRoot();
//       expect(root.children[0]!.parentSignature).toBe(root.nodeSignature);
//     });

//     test("parentSignature ignores parent directText when parent has significant attributes", () => {
//       const node = makeNode({
//         tagName: "div",
//         attributes: { id: "root" },
//         directText: "First text",
//         children: [makeNode()],
//       });
//       const otherNode = makeNode({
//         tagName: "div",
//         attributes: { id: "root" },
//         directText: "Second text",
//         children: [makeNode()],
//       });

//       const resultA = converter.convert(node)!;
//       const resultB = converter.convert(otherNode)!;

//       expect(resultA.getRoot().nodeSignature).not.toBe(resultB.getRoot().nodeSignature);
//       expect(resultA.getRoot().children[0]!.parentSignature).toBe(
//         resultB.getRoot().children[0]!.parentSignature,
//       );
//     });

//     test("grandchild parent points to child", () => {
//       const node = makeNode({
//         children: [makeNode({ children: [makeNode()] })],
//       });
//       const result = converter.convert(node)!;
//       const child = result.getRoot().children[0]!;
//       expect(child.children[0]!.parent).toBe(child);
//     });
//   });

//   // --- signatures ---

//   describe("signatures", () => {
//     test("nodeSignature is deterministic", () => {
//       const node = makeNode({ tagName: "div", attributes: { class: "foo" } });
//       const result1 = converter.convert(node)!.getRoot();
//       const result2 = converter.convert(node)!.getRoot();
//       expect(result1.nodeSignature).toBe(result2.nodeSignature);
//     });

//     test("innerSignature is deterministic", () => {
//       const node = makeNode({ children: [makeNode({ tagName: "span" })] });
//       const result1 = converter.convert(node)!.getRoot();
//       const result2 = converter.convert(node)!.getRoot();
//       expect(result1.innerSignature).toBe(result2.innerSignature);
//     });

//     test("contextSignature is deterministic", () => {
//       const node = makeNode({ tagName: "div", attributes: { class: "foo" } });
//       const result1 = converter.convert(node)!.getRoot();
//       const result2 = converter.convert(node)!.getRoot();
//       expect(result1.contextSignature).toBe(result2.contextSignature);
//     });

//     test("different tagName produces different nodeSignature", () => {
//       const div = converter.convert(makeNode({ tagName: "div" }))!.getRoot();
//       const span = converter.convert(makeNode({ tagName: "span" }))!.getRoot();
//       expect(div.nodeSignature).not.toBe(span.nodeSignature);
//     });

//     test("different attributes produce different nodeSignature", () => {
//       const a = converter
//         .convert(makeNode({ attributes: { class: "foo" } }))!
//         .getRoot();
//       const b = converter
//         .convert(makeNode({ attributes: { class: "bar" } }))!
//         .getRoot();
//       expect(a.nodeSignature).not.toBe(b.nodeSignature);
//     });

//     test("attribute order does not affect nodeSignature", () => {
//       const a = converter
//         .convert(makeNode({ attributes: { class: "foo", id: "bar" } }))!
//         .getRoot();
//       const b = converter
//         .convert(makeNode({ attributes: { id: "bar", class: "foo" } }))!
//         .getRoot();
//       expect(a.nodeSignature).toBe(b.nodeSignature);
//     });

//     test("nodes without attributes use directText in nodeSignature", () => {
//       const a = converter
//         .convert(makeNode({ tagName: "span", directText: "Uncle Tim" }))!
//         .getRoot();
//       const b = converter
//         .convert(makeNode({ tagName: "span", directText: "Aunt Sarah" }))!
//         .getRoot();
//       expect(a.nodeSignature).not.toBe(b.nodeSignature);
//     });

//     test("nodes with significant attributes still keep directText in nodeSignature", () => {
//       const a = converter
//         .convert(
//           makeNode({
//             tagName: "div",
//             attributes: { "data-role": "cousin" },
//             directText: "First text",
//           }),
//         )!
//         .getRoot();
//       const b = converter
//         .convert(
//           makeNode({
//             tagName: "div",
//             attributes: { "data-role": "cousin" },
//             directText: "Second text",
//           }),
//         )!
//         .getRoot();
//       expect(a.nodeSignature).not.toBe(b.nodeSignature);
//     });

//     test("different depth produces different contextSignature", () => {
//       const node = makeNode({ children: [makeNode()] });
//       const result = converter.convert(node)!;
//       const root = result.getRoot();
//       const child = root.children[0]!;
//       expect(root.contextSignature).not.toBe(child.contextSignature);
//     });

//     test("leaf node innerSignature uses directText", () => {
//       const a = converter.convert(makeNode({ directText: "hello" }))!.getRoot();
//       const b = converter.convert(makeNode({ directText: "world" }))!.getRoot();
//       expect(a.innerSignature).not.toBe(b.innerSignature);
//     });
//   });

//   // --- id ---

//   describe("id", () => {
//     test("each node gets a unique id", () => {
//       const node = makeNode({ children: [makeNode(), makeNode()] });
//       const result = converter.convert(node)!;
//       const root = result.getRoot();
//       const ids = [root.id, root.children[0]!.id, root.children[1]!.id];
//       const uniqueIds = new Set(ids);
//       expect(uniqueIds.size).toBe(3);
//     });

//     test("same node produces different id on each convert call", () => {
//       const node = makeNode();
//       const id1 = converter.convert(node)!.getRoot().id;
//       const id2 = converter.convert(node)!.getRoot().id;
//       expect(id1).not.toBe(id2);
//     });
//   });

//   // --- capturedAt ---

//   describe("capturedAt", () => {
//     test("capturedAt is a valid Date", () => {
//       const result = converter.convert(makeNode())!;
//       expect(result.getRoot().capturedAt).toBeInstanceOf(Date);
//     });

//     test("capturedAt is close to now", () => {
//       const before = Date.now();
//       const result = converter.convert(makeNode())!;
//       const after = Date.now();
//       const capturedAt = result.getRoot().capturedAt.getTime();
//       expect(capturedAt).toBeGreaterThanOrEqual(before);
//       expect(capturedAt).toBeLessThanOrEqual(after);
//     });
//   });
// });
