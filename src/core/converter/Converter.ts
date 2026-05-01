import { ContextTree } from "../context/ContextTree";
import type { HTMLNode } from "../plain/HTMLNode";

export interface Converter {
  convert(currentNode: HTMLNode, depth: number): ContextTree;
}
