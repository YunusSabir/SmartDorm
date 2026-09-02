const RuleEvaluator = require("./rules/RuleEvaluator");
const DependencyGraph = require("./graph/DependencyGraph");
const ConflictResolver = require("./arbitration/ConflictResolver");
const CycleDetector = require("./cycle-detection/CycleDetector");

class RuleEngine {
    constructor(rules, environment) {
        this.rules = rules;
        this.environment = environment;

        this.evaluator = new RuleEvaluator();
        this.conflictResolver = new ConflictResolver();

        this.graph = new DependencyGraph();
        this.graph.buildFromRules(this.rules);
    }

    // Add a rule while the system is running and rebuild the dependency
    // graph immediately, so cycle detection and chaining reflect the
    // new rule on the very next run().
    addRule(rule) {
        this.rules.push(rule);
        this.rebuildGraph();
    }

    removeRule(ruleId) {
        this.rules = this.rules.filter((rule) => rule.id !== ruleId);
        this.rebuildGraph();
    }

    rebuildGraph() {
        this.graph = new DependencyGraph();
        this.graph.buildFromRules(this.rules);
    }

    getCycleInfo() {
        const detector = new CycleDetector(this.graph);
        const cyclePath = detector.findCyclePath();

        return {
            detected: cyclePath !== null,
            path: cyclePath
        };
    }

    // Runs the engine against a state snapshot. Returns a structured
    // result (state + which rules fired + conflicts + a log feed) so
    // a UI can render everything the engine decided without having to
    // re-derive any of it itself.
    run(state) {
        const logs = [];
        const cycleInfo = this.getCycleInfo();

        // A cyclic dependency graph would make topological execution order
        // undefined and risks an infinite loop. Detect it up front and
        // refuse to execute, instead of ever starting the loop.
        if (cycleInfo.detected) {
            logs.push({
                type: "CYCLE",
                message: `Execution blocked. Circular dependency detected: ${cycleInfo.path.join(" \u2192 ")}`
            });

            return {
                state,
                cycle: cycleInfo,
                activeRuleIds: [],
                conflicts: [],
                logs
            };
        }

        const executionOrder = this.graph.getExecutionOrder();

        const activeRuleIds = new Set();
        const allConflicts = [];

        // Conflicts are re-detected on every pass of the while(changed) loop
        // below (a later chain step can surface the same contradiction
        // again). Without this cache, resolveConflict() would run — and
        // bump the loser's override count — once per pass instead of once
        // per real-world decision, artificially inflating the fairness
        // adjustment for a single event.
        const resolvedThisRun = new Map();

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

            // Resolve each distinct conflict exactly once per run(), even
            // if the same pair of rules is still both triggered on a later
            // pass of this loop.
            const conflictResults = [];

            for (const conflict of conflicts) {
                const key =
                    conflict.device + ":" +
                    conflict.rules.map(rule => rule.id).sort().join(",");

                let result = resolvedThisRun.get(key);

                if (!result) {
                    result =
                        this.conflictResolver.resolveConflict(
                            conflict
                        );

                    resolvedThisRun.set(key, result);

                    allConflicts.push(result.explanation);

                    logs.push({
                        type: "CONFLICT",
                        message: `Contradiction on ${conflict.device}: ${result.winner.id} beats ${result.loser.id} (${result.explanation.reason}).`
                    });
                }

                conflictResults.push({ conflict, result });
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

                activeRuleIds.add(rule.id);

                const oldValue =
                    state[rule.action.device];

                this.evaluator.executeRule(
                    rule,
                    state
                );

                const newValue =
                    state[rule.action.device];

                if (oldValue !== newValue) {
                    this.environment.setDeviceState(
                        rule.action.device,
                        newValue
                    );

                    changed = true;

                    logs.push({
                        type: "RULE",
                        message: `${rule.id} fired: IF ${rule.condition.variable} ${rule.condition.operator} ${rule.condition.value} THEN ${rule.action.device} = ${rule.action.value}`
                    });
                }
            }
        }

        if (activeRuleIds.size > 1) {
            logs.push({
                type: "CHAIN",
                message: `Chained execution across: ${[...activeRuleIds].join(" \u2192 ")}`
            });
        }

        if (logs.length === 0) {
            logs.push({
                type: "SYSTEM",
                message: "No rule conditions are currently true."
            });
        }

        return {
            state,
            cycle: cycleInfo,
            activeRuleIds: [...activeRuleIds],
            conflicts: allConflicts,
            logs
        };
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