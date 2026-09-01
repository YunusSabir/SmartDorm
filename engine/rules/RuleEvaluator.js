class RuleEvaluator {
    evaluateCondition(condition, state) {
        const actualValue = state[condition.variable];

        switch (condition.operator) {
            case ">":
                return actualValue > condition.value;

            case "<":
                return actualValue < condition.value;

            case "==":
                return actualValue === condition.value;

            case "!=":
                return actualValue !== condition.value;

            default:
                return false;
        }
    }

    evaluateRule(rule, state) {
        return this.evaluateCondition(rule.condition, state);
    }

    executeRule(rule, state) {
        state[rule.action.device] = rule.action.value;

        console.log(
            `${rule.id} triggered → ${rule.action.device} = ${rule.action.value}`
        );
    }
}

module.exports = RuleEvaluator;