const Rule = require("./Rule");
const RuleEvaluator = require("./RuleEvaluator");

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

const state = {
    temperature: 25,
    AC: "OFF"
};

const evaluator = new RuleEvaluator();

if (evaluator.evaluateRule(rule1, state)) {
    evaluator.executeRule(rule1, state);
}

console.log("Final state:", state);