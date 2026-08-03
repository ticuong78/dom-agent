import type { ContextNode } from "@convert/context";
// Note: type-only import — no circular dependency at runtime.

export type SelectorSuggestion = {
  selector: string;
  confidence: number;
  strategy: "self" | "path" | "root";
};

/**
 * Suggests the best CSS selector for a given ContextNode.
 *
 * 1. If selfScore === 1.0, the node's attributes are unique across the
 *    entire DOM → self selector alone is enough.
 * 2. Otherwise, combine self selector with a path from the best ancestor
 *    to guarantee uniqueness.
 * 3. If no ancestor is reliable either → full path from root.
 */
export function suggestSelector(node: ContextNode): SelectorSuggestion {
  const self = buildSelfSelector(node);

  // Truly unique on the entire DOM — self selector is enough
  if (node.selectorScore === 1.0) {
    return {
      selector: self,
      confidence: 1.0,
      strategy: "self",
    };
  }

  // Not unique alone → need path for disambiguation
  const ancestor = findBestAncestor(node);

  if (ancestor && ancestor.node.selectorScore > 0) {
    const anchorSelector = buildSelfSelector(ancestor.node);
    const path = buildPathDown(ancestor.node, node);
    return {
      selector: `${anchorSelector} > ${path}`,
      confidence: ancestor.node.selectorScore,
      strategy: "path",
    };
  }

  // No reliable ancestor → full path from root
  return {
    selector: buildFullPath(node),
    confidence: 0,
    strategy: "root",
  };
}

// ─── Internal helpers ──────────────────────────────────────

/**
 * Builds a selector for a single node: attribute (if any) + :nth-child.
 */
function buildSelfSelector(node: ContextNode): string {
  const nth = `:nth-child(${node.nthChild + 1})`;
  const key = node.bestAttr;

  if (!key) return `${node.tagName}${nth}`;

  const value = node.attributeAnalytic[key]?.actualValue;
  if (!value) return `${node.tagName}${nth}`;

  if (key === "id") return `#${value}${nth}`;
  return `${node.tagName}[${key}="${value}"]${nth}`;
}

/**
 * Walks the parent chain and returns the ancestor with the highest selectorScore.
 */
function findBestAncestor(
  node: ContextNode,
): { node: ContextNode; depth: number } | null {
  let best: { node: ContextNode; depth: number } | null = null;
  let current = node.parent;
  let depth = 1;

  while (current) {
    if (!best || current.selectorScore > best.node.selectorScore) {
      best = { node: current, depth };
    }
    current = current.parent;
    depth++;
  }

  return best;
}

/**
 * Builds the path from an ancestor down to the target node.
 * Intermediate segments use tagName:nth-child.
 * Last segment uses the target's self selector (attr + nth-child).
 */
function buildPathDown(from: ContextNode, to: ContextNode): string {
  const chain: ContextNode[] = [];
  let current: ContextNode | null = to;

  while (current && current !== from) {
    chain.unshift(current);
    current = current.parent;
  }

  return chain
    .map((n, i) =>
      i === chain.length - 1
        ? buildSelfSelector(n)
        : `${n.tagName}:nth-child(${n.nthChild + 1})`,
    )
    .join(" > ");
}

/**
 * Builds a full path from root down to the target node.
 * Last segment uses the target's self selector.
 */
function buildFullPath(node: ContextNode): string {
  const chain: ContextNode[] = [];
  let current: ContextNode | null = node;

  while (current) {
    chain.unshift(current);
    current = current.parent;
  }

  return chain
    .map((n, i) =>
      i === chain.length - 1
        ? buildSelfSelector(n)
        : `${n.tagName}:nth-child(${n.nthChild + 1})`,
    )
    .join(" > ");
}
