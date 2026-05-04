// import { SHA256HashAdapter } from "@adapters/hash/SHA256HashAdapter";
// import { UUIDAdapter } from "@adapters/id/UUIDAdapter";
// import type { HTMLNode } from "@core/plain/HTMLNode";
// import { HTMLToContextConverter } from "@implementation/converter/HTMLToContextConverter";
// import { TreeHierarchyDiffViewer } from "@implementation/diff/viewer/TreeHierarchyDiffViewer";

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

// describe("TreeHierarchyDiffViewer", () => {
//   test("classifies same-depth parent changes as REPARENTED", () => {
//     const converter = new HTMLToContextConverter(
//       new SHA256HashAdapter(),
//       new UUIDAdapter(),
//     );
//     const viewer = new TreeHierarchyDiffViewer();

//     const cousinRef = makeNode({
//       tagName: "div",
//       attributes: { "data-role": "cousin" },
//       siblingCount: 1,
//       nthChild: 0,
//     });
//     const cousinTar = makeNode({
//       tagName: "div",
//       attributes: { "data-role": "cousin" },
//       siblingCount: 1,
//       nthChild: 0,
//     });

//     const reference = converter.convert(
//       makeNode({
//         tagName: "main",
//         children: [
//           makeNode({
//             tagName: "section",
//             siblingCount: 2,
//             nthChild: 0,
//             children: [cousinRef],
//           }),
//           makeNode({
//             tagName: "article",
//             siblingCount: 2,
//             nthChild: 1,
//           }),
//         ],
//       }),
//     )!;

//     const target = converter.convert(
//       makeNode({
//         tagName: "main",
//         children: [
//           makeNode({
//             tagName: "section",
//             siblingCount: 2,
//             nthChild: 0,
//           }),
//           makeNode({
//             tagName: "article",
//             siblingCount: 2,
//             nthChild: 1,
//             children: [cousinTar],
//           }),
//         ],
//       }),
//     )!;

//     const points = viewer.highlight(reference, target);
//     const cousinPoint = points.find(
//       (point) =>
//         point.referenceNode?.attribute["data-role"] === "cousin" &&
//         point.targetNode?.attribute["data-role"] === "cousin",
//     );

//     expect(cousinPoint?.type).toBe("REPARENTED");
//   });
// });
