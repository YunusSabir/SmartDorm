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
        for (const rule of rules) {
            this.addRule(rule.id);
        }

        for (const ruleA of rules) {
            for (const ruleB of rules) {

                if (ruleA.id === ruleB.id) {
                    continue;
                }

                if (ruleA.action.device === ruleB.condition.variable) {
                    this.addDependency(ruleA.id, ruleB.id);
                }
            }
        }
    }

    getExecutionOrder() {
        const inDegree = new Map();

        for (const rule of this.graph.keys()) {
            inDegree.set(rule, 0);
        }

        for (const dependencies of this.graph.values()) {
            for (const dependentRule of dependencies) {
                inDegree.set(
                    dependentRule,
                    inDegree.get(dependentRule) + 1
                );
            }
        }

        const queue = [];

        for (const [rule, degree] of inDegree) {
            if (degree === 0) {
                queue.push(rule);
            }
        }

        const order = [];

        while (queue.length > 0) {
            const currentRule = queue.shift();

            order.push(currentRule);

            for (const nextRule of this.graph.get(currentRule)) {
                inDegree.set(
                    nextRule,
                    inDegree.get(nextRule) - 1
                );

                if (inDegree.get(nextRule) === 0) {
                    queue.push(nextRule);
                }
            }
        }

        if (order.length !== this.graph.size) {
            throw new Error("Circular dependency detected");
        }

        return order;
    }

    display() {
        for (const [rule, dependencies] of this.graph) {
            console.log(`${rule} → ${dependencies.join(", ")}`);
        }
    }

    // Serializable edge list, e.g. for sending over the wire to a UI
    // that wants to draw the dependency graph.
    getEdges() {
        const edges = [];

        for (const [source, targets] of this.graph) {
            for (const target of targets) {
                edges.push({
                    id: `${source}-${target}`,
                    source,
                    target
                });
            }
        }

        return edges;
    }
}

module.exports = DependencyGraph;