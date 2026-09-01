const RuleEvaluator = require("./rules/RuleEvaluator");
const DependencyGraph = require("./graph/DependencyGraph");

class RuleEngine {
    constructor(rules, environment) {
        this.rules = rules;
        this.environment = environment;
        this.evaluator = new RuleEvaluator();
        this.graph = new DependencyGraph();

        this.graph.buildFromRules(this.rules);
    }

    run(state) {
        const executionOrder = this.graph.getExecutionOrder();

        let changed = true;

        while (changed) {
            changed = false;

            for (const ruleId of executionOrder) {
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

    handleEvent(event) {
        console.log(
            `\nProcessing event: ${event.variable} = ${event.newValue}`
        );

        const state = this.environment.getState();

        const updatedState = this.run(state);

        return updatedState;
    }
}

module.exports = RuleEngine;