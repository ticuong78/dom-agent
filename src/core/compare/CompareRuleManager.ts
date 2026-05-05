import type { CompareRule } from "./CompareRule";

/**
 * A named registry of {@link CompareRule} instances.
 *
 * Allows pre-registering multiple comparison strategies and retrieving
 * them by name at runtime. Useful when different parts of the pipeline
 * need different matching strategies.
 *
 * @example
 * ```ts
 * const manager = new CompareRuleManager();
 * manager
 *   .register("strict", new CompareRule([...]))
 *   .register("loose", new CompareRule([...]));
 *
 * const rule = manager.get("strict");
 * const comparer = new RuleBasedComparer(rule);
 * ```
 */
export class CompareRuleManager {
  private rules = new Map<string, CompareRule>();

  /**
   * Registers a rule under the given name. Overwrites any existing rule
   * with the same name.
   *
   * @param name - Unique identifier for this rule.
   * @param rule - The {@link CompareRule} to register.
   * @returns `this` for method chaining.
   */
  register(name: string, rule: CompareRule): this {
    this.rules.set(name, rule);
    return this;
  }

  /**
   * Retrieves a registered rule by name.
   *
   * @param name - The name the rule was registered under.
   * @returns The {@link CompareRule} instance.
   * @throws Error if no rule is registered with the given name.
   */
  get(name: string): CompareRule {
    const rule = this.rules.get(name);
    if (!rule) throw new Error(`CompareRule "${name}" not found`);
    return rule;
  }

  /**
   * Checks whether a rule with the given name exists in the registry.
   *
   * @param name - The name to look up.
   * @returns `true` if a rule is registered under that name.
   */
  has(name: string): boolean {
    return this.rules.has(name);
  }
}
