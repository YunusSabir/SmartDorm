class ConflictResolver {
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

    getEffectivePriority(rule) {
        const fairnessAdjustment =
            Math.min(rule.overrideHistory * 0.5, 2);

        return rule.basePriority + fairnessAdjustment;
    }

    resolveConflict(conflict) {
        const [ruleA, ruleB] = conflict.rules;

        const priorityA = this.getEffectivePriority(ruleA);
        const priorityB = this.getEffectivePriority(ruleB);

        let winner;

        if (priorityA > priorityB) {
            winner = ruleA;
            ruleB.overrideHistory++;
        } else if (priorityB > priorityA) {
            winner = ruleB;
            ruleA.overrideHistory++;
        } else {
            winner = ruleA;
            ruleB.overrideHistory++;
        }

        return {
            winner,
            priorities: {
                [ruleA.id]: priorityA,
                [ruleB.id]: priorityB
            }
        };
    }
}

module.exports = ConflictResolver;