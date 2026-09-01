const WebSocket = require("ws");

const EventBus = require("../simulator/EventBus");
const Environment = require("../simulator/Environment");
const Rule = require("../engine/rules/Rule");
const RuleEngine = require("../engine/RuleEngine");

const eventBus = new EventBus();
const environment = new Environment(eventBus);

// Temporary demo rules
const rules = [
    new Rule(
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
    ),

    new Rule(
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
    )
];

const engine = new RuleEngine(
    rules,
    environment
);

const wss = new WebSocket.Server({
    port: 8080
});

console.log("SmartDorm WebSocket server running on port 8080");

wss.on("connection", (ws) => {
    console.log("Frontend connected");

    // Send current environment state
    ws.send(JSON.stringify({
        type: "state",
        data: environment.getState()
    }));

    ws.on("message", (message) => {
        try {
            const data = JSON.parse(message);

            console.log("Message received:", data);

            if (data.type === "sensorUpdate") {
                environment.updateState(
                    data.variable,
                    data.value
                );

                // Send updated state to the frontend
                ws.send(JSON.stringify({
                    type: "state",
                    data: environment.getState()
                }));
            }

        } catch (error) {
            console.log("Invalid message:", error.message);
        }
    });

    ws.on("close", () => {
        console.log("Frontend disconnected");
    });
});

// React to environment changes
eventBus.on("stateChanged", (event) => {
    engine.handleEvent(event);

    const updatedState =
        environment.getState();

    // Broadcast updated state to all connected clients
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: "state",
                data: updatedState
            }));
        }
    });
});