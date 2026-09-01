const RuleEvaluator = require("./rules/RuleEvaluator");
const DependencyGraph = require("./graph/DependencyGraph");

class RuleEngine {
    constructor(rules) {
        this.rules = rules;
        this.evaluator = new RuleEvaluator();
        this.graph = new DependencyGraph();

        // Build dependency graph from the rules
        this.graph.buildFromRules(this.rules);
    }

    run(state) {
        // Get the correct dependency-based execution order
        const executionOrder = this.graph.getExecutionOrder();

        let changed = true;

        while (changed) {
            changed = false;

            for (const ruleId of executionOrder) {
                // Find the actual rule using its ID
                const rule = this.rules.find(
                    rule => rule.id === ruleId
                );

                if (!rule) {
                    continue;
                }

                const conditionMet =
                    this.evaluator.evaluateRule(rule, state);

                if (conditionMet) {
                    const oldValue =
                        state[rule.action.device];

                    this.evaluator.executeRule(
                        rule,
                        state
                    );

                    const newValue =
                        state[rule.action.device];

                    if (oldValue !== newValue) {
                        changed = true;
                    }
                }
            }
        }

        return state;
    }
}

module.exports = RuleEngine;