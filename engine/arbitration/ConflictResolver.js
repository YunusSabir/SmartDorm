class ConflictResolver {
    constructor() {
        this.overrideHistory = new Map();
    }

    findConflicts(triggeredRules) {
        const conflicts = [];

        for (let i = 0; i < triggeredRules.length; i++) {
            for (let j = i + 1; j < triggeredRules.length; j++) {
                const ruleA = triggeredRules[i];
                const ruleB = triggeredRules[j];

                const sameDevice =
                    ruleA.action.device === ruleB.action.device;

                const differentValues =
                    ruleA.action.value !== ruleB.action.value;

                if (sameDevice && differentValues) {
                    conflicts.push({
                        device: ruleA.action.device,
                        rules: [ruleA, ruleB]
                    });
                }
            }
        }

        return conflicts;
    }

    getOverrideCount(resident) {
        return this.overrideHistory.get(resident) || 0;
    }

    getEffectivePriority(rule) {
        const overrideCount =
            this.getOverrideCount(rule.resident);

        const fairnessAdjustment =
            Math.min(overrideCount * 0.5, 2);

        return rule.basePriority + fairnessAdjustment;
    }

    resolveConflict(conflict) {
        const [ruleA, ruleB] = conflict.rules;

        const priorityA =
            this.getEffectivePriority(ruleA);

        const priorityB =
            this.getEffectivePriority(ruleB);

        let winner;
        let loser;
        let reason;

        if (priorityA > priorityB) {
            winner = ruleA;
            loser = ruleB;
            reason = `${priorityA} > ${priorityB}`;
        } else if (priorityB > priorityA) {
            winner = ruleB;
            loser = ruleA;
            reason = `${priorityB} > ${priorityA}`;
        } else {
            winner = ruleA;
            loser = ruleB;
            reason =
                "Equal effective priority; Rule A wins tie-breaker";
        }

        // Increase the losing resident's override count
        const currentCount =
            this.getOverrideCount(loser.resident);

        this.overrideHistory.set(
            loser.resident,
            currentCount + 1
        );

        const fairnessA =
            priorityA - ruleA.basePriority;

        const fairnessB =
            priorityB - ruleB.basePriority;

        const explanation = {
            device: conflict.device,

            winner: {
                ruleId: winner.id,
                resident: winner.resident,
                action: winner.action.value,
                basePriority: winner.basePriority,
                fairnessAdjustment:
                    winner === ruleA ? fairnessA : fairnessB,
                effectivePriority:
                    winner === ruleA ? priorityA : priorityB
            },

            loser: {
                ruleId: loser.id,
                resident: loser.resident,
                action: loser.action.value,
                basePriority: loser.basePriority,
                fairnessAdjustment:
                    loser === ruleA ? fairnessA : fairnessB,
                effectivePriority:
                    loser === ruleA ? priorityA : priorityB
            },

            reason:
                `Higher effective priority (${reason})`,

            overrideCount:
                this.getOverrideCount(loser.resident)
        };

        return {
            winner,
            loser,
            priorities: {
                [ruleA.id]: priorityA,
                [ruleB.id]: priorityB
            },
            explanation
        };
    }
}

module.exports = ConflictResolver;