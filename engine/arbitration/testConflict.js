const Rule = require("../rules/Rule");
const ConflictResolver = require("./ConflictResolver");

const rule1 = new Rule(
    "R1",
    "Resident A",
    {
        variable: "temperature",
        operator: ">",
        value: 30
    },
    {
        device: "AC",
        value: "ON"
    },
    5
);

const rule2 = new Rule(
    "R2",
    "Resident B",
    {
        variable: "temperature",
        operator: ">",
        value: 28
    },
    {
        device: "AC",
        value: "OFF"
    },
    7
);

const resolver = new ConflictResolver();

const triggeredRules = [rule1, rule2];

const conflicts = resolver.findConflicts(triggeredRules);

console.log("Conflicts:");
console.log(conflicts);

for (const conflict of conflicts) {
    const result = resolver.resolveConflict(conflict);

console.log("\nConflict on:", conflict.device);
console.log("Rule A:", conflict.rules[0].id);
console.log("Rule B:", conflict.rules[1].id);

console.log("Effective priorities:");
console.log(result.priorities);

console.log("Winner:", result.winner.id);

console.log("\nOverride history:");
console.log(
    rule1.id,
    "→",
    rule1.overrideHistory
);

console.log(
    rule2.id,
    "→",
    rule2.overrideHistory
);
}