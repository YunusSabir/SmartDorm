const Rule = require("./rules/Rule");
const RuleEngine = require("./RuleEngine");
const Environment = require("../simulator/Environment");
const EventBus = require("../simulator/EventBus");

const eventBus = new EventBus();
const environment = new Environment(eventBus);

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

const rules = [rule1, rule2];

const engine = new RuleEngine(
    rules,
    environment
);

eventBus.on("stateChanged", (event) => {
    engine.handleEvent(event);
});

console.log("Changing temperature to 32...\n");

environment.updateState(
    "temperature",
    32
);

console.log("\nFinal state:");
console.log(environment.getState());