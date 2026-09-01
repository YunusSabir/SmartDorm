const Rule = require("./rules/Rule");
const RuleEngine = require("./RuleEngine");

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
    "Resident A",
    {
        variable: "AC",
        operator: "==",
        value: "ON"
    },
    {
        device: "FAN",
        value: "ON"
    },
    4
);

const rule3 = new Rule(
    "R3",
    "Resident A",
    {
        variable: "FAN",
        operator: "==",
        value: "ON"
    },
    {
        device: "BLINDS",
        value: "CLOSED"
    },
    3
);

const rules = [rule1, rule2, rule3];

const state = {
    temperature: 32,
    AC: "OFF",
    FAN: "OFF",
    BLINDS: "OPEN"
};

const engine = new RuleEngine(rules);

const finalState = engine.run(state);

console.log("Final state:");
console.log(finalState);