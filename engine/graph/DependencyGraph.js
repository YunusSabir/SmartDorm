class DependencyGraph {
    constructor() {
        this.graph = new Map();
    }

    addRule(ruleId) {
        if (!this.graph.has(ruleId)) {
            this.graph.set(ruleId, []);
        }
    }

    addDependency(fromRule, toRule) {
        this.addRule(fromRule);
        this.addRule(toRule);

        this.graph.get(fromRule).push(toRule);
    }

    buildFromRules(rules) {
        // Add every rule as a node
        for (const rule of rules) {
            this.addRule(rule.id);
        }

        // Find dependencies automatically
        for (const ruleA of rules) {
            for (const ruleB of rules) {

                if (ruleA.id === ruleB.id) {
                    continue;
                }

                // Rule A writes a state that Rule B reads
                if (
                    ruleA.action.device === ruleB.condition.variable
                ) {
                    this.addDependency(ruleA.id, ruleB.id);
                }
            }
        }
    }

    display() {
        for (const [rule, dependencies] of this.graph) {
            console.log(`${rule} → ${dependencies.join(", ")}`);
        }
    }
}

module.exports = DependencyGraph;