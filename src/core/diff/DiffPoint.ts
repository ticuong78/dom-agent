import type { ContextNode } from "@core/atoms";

export type DiffType =
  | "ADDED" // có trong target, không có trong reference
  | "DELETED" // có trong reference, không có trong target
  | "RELOCATED" // node + subtree giữ nguyên, chỉ đổi vị trí
  | "NODE_CHANGED" // bề mặt node đổi (tag/attrs/text), subtree giữ nguyên
  | "SUBTREE_CHANGED" // bề mặt node giữ nguyên, subtree bên dưới đổi
  | "FULLY_CHANGED"; // cả node lẫn subtree đều đổi

export type DiffPoint = {
  type: DiffType;
  referenceNode: ContextNode | null; // null nếu ADDED
  targetNode: ContextNode | null; // null nếu DELETED
};
