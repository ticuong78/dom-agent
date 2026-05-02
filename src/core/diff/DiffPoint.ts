import type { ContextNode } from "@core/atoms";

/**
 * DiffType — phân loại change theo trục (surfaceMatch × subtreeMatch).
 *
 *  surface = nodeSignature      (tag | attrCount | attrShape | directTextLen)
 *  subtree = innerSignature     (hash đệ quy của children + directText)
 *  skeleton = structuralSignature (tag | attrCount) — fallback yếu nhất
 *
 *  | nodeMatch | innerMatch | DiffType         |
 *  | --------- | ---------- | ---------------- |
 *  |   ✓       |    ✓       | RELOCATED        |
 *  |   ✓       |    ✗       | SUBTREE_CHANGED  |
 *  |   ✗       |    ✓       | NODE_CHANGED     |
 *  |   ✗       |    ✗       | FULLY_CHANGED *  |
 *
 *  (*) FULLY_CHANGED chỉ phát ra khi vẫn còn match qua structuralSignature.
 *      Ngoài ra coi như DELETED / ADDED.
 */
export type DiffType =
  | "ADDED" // có trong target, không có trong reference
  | "DELETED" // có trong reference, không có trong target — không tìm thấy partner ở mọi cấp độ
  | "RELOCATED" // surface + subtree giữ nguyên, chỉ đổi vị trí
  | "NODE_CHANGED" // surface đổi (tag/attrs/text), subtree giữ nguyên
  | "SUBTREE_CHANGED" // surface giữ nguyên, subtree (descendants) đổi
  | "FULLY_CHANGED"; // surface + subtree đều đổi, chỉ còn match structural skeleton

export type DiffPoint = {
  type: DiffType;
  referenceNode: ContextNode | null; // null nếu ADDED
  targetNode: ContextNode | null; // null nếu DELETED
};
