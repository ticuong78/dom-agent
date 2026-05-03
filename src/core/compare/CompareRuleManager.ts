import type { CompareRule } from "./CompareRule";

export class CompareRuleManager {
  private rules = new Map<string, CompareRule>();

  register(name: string, rule: CompareRule): this {
    this.rules.set(name, rule);
    return this;
  }

  get(name: string): CompareRule {
    const rule = this.rules.get(name);
    if (!rule) throw new Error(`CompareRule "${name}" not found`);
    return rule;
  }

  has(name: string): boolean {
    return this.rules.has(name);
  }
}
