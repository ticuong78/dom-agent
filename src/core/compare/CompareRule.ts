import type { ContextNode, ValueType } from "@core/atoms";

type NumericKeys = {
  [K in keyof ContextNode]: ContextNode[K] extends number ? K : never;
}[keyof ContextNode];

type StringKeys = {
  [K in keyof ContextNode]: ContextNode[K] extends string ? K : never;
}[keyof ContextNode];

type NumericComparePoint = {
  attType: NumericKeys;
  matchType: "less" | "greater" | "equal";
  logicType: "and" | "or";
};

type StringComparePoint = {
  attType: StringKeys;
  matchType: "match" | "unmatch";
  logicType: "and" | "or";
};

/**
 * Compares the `attributeAnalytic` records between two nodes.
 *
 * Match types:
 * - `keys_match`   — both nodes have the exact same set of attribute keys
 * - `values_match` — for every shared key, actualValue is identical
 * - `full_match`   — keys_match AND values_match (strict equality)
 */
type AttributeComparePoint = {
  attType: "attributeAnalytic";
  matchType: "keys_match" | "values_match" | "full_match";
  logicType: "and" | "or";
};

export type ComparePoint =
  | NumericComparePoint
  | StringComparePoint
  | AttributeComparePoint;

export class CompareRule {
  constructor(readonly points: ComparePoint[]) {}

  evaluate(a: ContextNode, b: ContextNode): boolean {
    let result = true;

    for (const point of this.points) {
      let pointResult: boolean;

      if (point.attType === "attributeAnalytic") {
        pointResult = this.evaluateAttributes(
          a.attributeAnalytic,
          b.attributeAnalytic,
          point.matchType,
        );
      } else {
        const aVal = a[point.attType];
        const bVal = b[point.attType];

        if (typeof aVal === "number" && typeof bVal === "number") {
          const p = point as NumericComparePoint;
          if (p.matchType === "equal") pointResult = aVal === bVal;
          else if (p.matchType === "less") pointResult = aVal < bVal;
          else pointResult = aVal > bVal;
        } else {
          const p = point as StringComparePoint;
          pointResult =
            p.matchType === "match"
              ? String(aVal) === String(bVal)
              : String(aVal) !== String(bVal);
        }
      }

      if (point.logicType === "or") {
        result = result || pointResult;
      } else {
        result = result && pointResult;
      }
    }

    return result;
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
