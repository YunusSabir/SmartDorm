const RuleEvaluator = require("./rules/RuleEvaluator");

class RuleEngine {
    constructor(rules) {
        this.rules = rules;
        this.evaluator = new RuleEvaluator();
    }

    run(state) {
        let changed = true;

        while (changed) {
            changed = false;

            for (const rule of this.rules) {
                const conditionMet = this.evaluator.evaluateRule(rule, state);

                if (conditionMet) {
                    const oldValue = state[rule.action.device];

                    this.evaluator.executeRule(rule, state);

                    const newValue = state[rule.action.device];

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