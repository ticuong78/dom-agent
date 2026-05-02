import type { HTMLNode } from "./HTMLNode";

export interface HTMLAdapter {
  parse(html: string): HTMLNode | null;
}
