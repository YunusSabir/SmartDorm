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
        return this.evaluateCondition(
            rule.condition,
            state
        );
    }

    executeRule(rule, state) {
        const device = rule.action.device;
        const value = rule.action.value;

        state[device] = value;

        console.log(
            `${rule.id} triggered → ${device} = ${value}`
        );
    }
}

module.exports = RuleEvaluator;