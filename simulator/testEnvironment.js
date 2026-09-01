const Environment = require("./Environment");

const environment = new Environment();

console.log("Initial state:");
console.log(environment.getState());

environment.updateState("temperature", 32);
environment.updateState("occupancy", 1);
environment.updateState("window", "OPEN");

console.log("\nUpdated state:");
console.log(environment.getState());