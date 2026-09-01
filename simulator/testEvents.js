const EventBus = require("./EventBus");
const Environment = require("./Environment");

const eventBus = new EventBus();

const environment = new Environment(eventBus);

eventBus.on("stateChanged", (event) => {
    console.log("EVENT RECEIVED:");
    console.log(event);
});

environment.updateState("temperature", 32);
environment.updateState("occupancy", 1);
environment.updateState("window", "OPEN");