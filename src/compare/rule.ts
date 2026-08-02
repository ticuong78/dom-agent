import type { ContextNode, ValueType } from "../convert/context";

type NumericKeys = {
  [K in keyof ContextNode]: ContextNode[K] extends number ? K : never;
}[keyof ContextNode];

type StringKeys = {
  [K in keyof ContextNode]: ContextNode[K] extends string ? K : never;
}[keyof ContextNode];

/**
 * A comparison point that evaluates a numeric property between two nodes.
 */
type NumericComparePoint = {
  /** The numeric property to compare (e.g. `"depth"`, `"childCount"`). */
  attType: NumericKeys;

  /** How to compare: less than, greater than, or equal. */
  matchType: "less" | "greater" | "equal";

  /** How to combine with previous points: AND (all must pass) or OR (any can pass). */
  logicType: "and" | "or";
};

/**
 * A comparison point that evaluates a string property between two nodes.
 */
type StringComparePoint = {
  /** The string property to compare (e.g. `"tagName"`, `"directTextHash"`). */
  attType: StringKeys;

  /** Whether values should match or differ. */
  matchType: "match" | "unmatch";

  /** How to combine with previous points. */
  logicType: "and" | "or";
};

/**
 * A comparison point that evaluates the `attributeAnalytic` records.
 *
 * Match types:
 * - `"keys_match"` — both nodes have the exact same set of attribute keys
 * - `"values_match"` — for every shared key, `actualValue` is identical
 * - `"full_match"` — keys_match AND values_match (strict equality)
 */
type AttributeComparePoint = {
  attType: "attributeAnalytic";
  matchType: "keys_match" | "values_match" | "full_match";
  logicType: "and" | "or";
};

/**
 * A single comparison criterion used within a {@link CompareRule}.
 *
 * Each point specifies which property to check, what condition to apply,
 * and how to logically combine with other points in the rule.
 */
export type ComparePoint =
  | NumericComparePoint
  | StringComparePoint
  | AttributeComparePoint;

/**
 * A rule composed of multiple {@link ComparePoint} criteria that determines
 * whether two {@link ContextNode} instances are considered "the same entity."
 *
 * Points are evaluated sequentially with AND/OR logic. The rule passes if
 * the final accumulated boolean is `true`.
 *
 * @example
 * ```ts
 * // Match nodes that share the same tagName AND same attribute keys
 * const rule = new CompareRule([
 *   { attType: "tagName", matchType: "match", logicType: "and" },
 *   { attType: "attributeAnalytic", matchType: "keys_match", logicType: "and" },
 * ]);
 *
 * const isSame = rule.evaluate(nodeA, nodeB); // true or false
 * ```
 */
export class CompareRule {
  /** The ordered list of comparison criteria. */
  constructor(readonly points: ComparePoint[]) {}

  /**
   * Evaluates whether two nodes satisfy all criteria in this rule.
   *
   * @param a - First node (typically from the reference tree).
   * @param b - Second node (typically from the target tree).
   * @returns `true` if the nodes are considered the same entity by this rule.
   */
  evaluate(a: ContextNode, b: ContextNode): boolean {
    if (this.points.length === 0) return true;

    let result = this._evaluatePoint(a, b, this.points[0]!);

    for (let i = 1; i < this.points.length; i++) {
      const point = this.points[i]!;
      const pointResult = this._evaluatePoint(a, b, point);

      if (point.logicType === "or") {
        result = result || pointResult;
      } else {
        result = result && pointResult;
      }
    }

    return result;
  }

  /**
   * Evaluates a single ComparePoint against two nodes.
   */
  private _evaluatePoint(
    a: ContextNode,
    b: ContextNode,
    point: ComparePoint,
  ): boolean {
    if (point.attType === "attributeAnalytic") {
      return this.evaluateAttributes(
        a.attributeAnalytic,
        b.attributeAnalytic,
        point.matchType,
      );
    }

    const aVal = a[point.attType];
    const bVal = b[point.attType];

    if (typeof aVal === "number" && typeof bVal === "number") {
      const p = point as NumericComparePoint;
      if (p.matchType === "equal") return aVal === bVal;
      if (p.matchType === "less") return aVal < bVal;
      return aVal > bVal;
    }

    const p = point as StringComparePoint;
    return p.matchType === "match"
      ? String(aVal) === String(bVal)
      : String(aVal) !== String(bVal);
  }

  /**
   * Evaluates two attributeAnalytic records against a match type.
   */
  private evaluateAttributes(
    a: Record<string, ValueType>,
    b: Record<string, ValueType>,
    matchType: AttributeComparePoint["matchType"],
  ): boolean {
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();

    const keysEqual =
      aKeys.length === bKeys.length && aKeys.every((k, i) => k === bKeys[i]);

    if (matchType === "keys_match") return keysEqual;

    // values_match: for every key present in BOTH, actualValue must be identical
    const sharedKeys = aKeys.filter((k) => k in b);
    const valuesEqual =
      sharedKeys.length > 0 &&
      sharedKeys.every((k) => a[k]!.actualValue === b[k]!.actualValue);

    if (matchType === "values_match") return valuesEqual;

    // full_match: keys must match AND all values must match
    return keysEqual && valuesEqual;
  }
}
