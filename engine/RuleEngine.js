const RuleEvaluator = require("./rules/RuleEvaluator");
const DependencyGraph = require("./graph/DependencyGraph");
const ConflictResolver = require("./arbitration/ConflictResolver");

class RuleEngine {
    constructor(rules, environment) {
        this.rules = rules;
        this.environment = environment;

        this.evaluator = new RuleEvaluator();
        this.graph = new DependencyGraph();
        this.conflictResolver = new ConflictResolver();

        this.graph.buildFromRules(this.rules);
    }

    run(state) {
        const executionOrder = this.graph.getExecutionOrder();

        let changed = true;

        while (changed) {
            changed = false;

            const triggeredRules = [];

            // Find all rules whose conditions are currently true
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
                    triggeredRules.push(rule);
                }
            }

            // Detect conflicts between triggered rules
            const conflicts =
                this.conflictResolver.findConflicts(
                    triggeredRules
                );

            // Resolve each conflict exactly once
            const conflictResults = [];

            for (const conflict of conflicts) {
                const result =
                    this.conflictResolver.resolveConflict(
                        conflict
                    );

                conflictResults.push({
                    conflict,
                    result
                });

                console.log(
                    `\nCONFLICT on ${conflict.device}`
                );

                console.log(
                    `Winner: ${result.winner.id}`
                );

                console.log(
                    "Effective priorities:",
                    result.priorities
                );
                console.log("Why this rule won:");
                console.log(result.explanation);
            }

            // Store the winning rules
            const winners = new Set();

            for (const item of conflictResults) {
                winners.add(item.result.winner.id);
            }

            // Execute rules
            for (const rule of triggeredRules) {

                const isConflicting =
                    conflicts.some(conflict =>
                        conflict.rules.some(
                            conflictingRule =>
                                conflictingRule.id === rule.id
                        )
                    );

                const isWinner =
                    winners.has(rule.id);

                // Skip a conflicting rule if it lost
                if (isConflicting && !isWinner) {
                    continue;
                }

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

        return state;
    }

    handleEvent(event) {
        console.log(
            `\nProcessing event: ${event.variable} = ${event.newValue}`
        );

        const state =
            this.environment.getState();

        return this.run(state);
    }
}

module.exports = RuleEngine;