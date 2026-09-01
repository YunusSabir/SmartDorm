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

const rules = [rule1, rule2];

const engine = new RuleEngine(
    rules,
    environment
);

eventBus.on("stateChanged", (event) => {
    engine.handleEvent(event);
});

console.log("Initial state:");
console.log(environment.getState());

console.log("\nChanging temperature to 32...");

environment.updateState(
    "temperature",
    32
);

console.log("\nFinal state:");
console.log(environment.getState());