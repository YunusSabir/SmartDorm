const WebSocket = require("ws");

const EventBus = require("../simulator/EventBus");
const Environment = require("../simulator/Environment");
const Rule = require("../engine/rules/Rule");
const RuleEngine = require("../engine/RuleEngine");

const eventBus = new EventBus();
const environment = new Environment(eventBus);

// Demo rules. R1/R2 form a genuine contradiction (both fire whenever
// temperature > 30, opposite AC values). R3/R4 form a genuine two-hop
// chain (window -> fan -> blinds). No cycle is pre-loaded: use the
// "Inject Cycle" button in the UI (or send an "addRule" message) to
// create one live and watch the backend catch it.
const rules = [
    new Rule(
        "R1",
        "Resident A",
        { variable: "temperature", operator: ">", value: 30 },
        { device: "AC", value: "ON" },
        5
    ),
    new Rule(
        "R2",
        "Resident B",
        { variable: "temperature", operator: ">", value: 28 },
        { device: "AC", value: "OFF" },
        7
    ),
    new Rule(
        "R3",
        "Building Policy",
        { variable: "window", operator: "==", value: "OPEN" },
        { device: "FAN", value: "ON" },
        4
    ),
    new Rule(
        "R4",
        "Building Policy",
        { variable: "FAN", operator: "==", value: "ON" },
        { device: "BLINDS", value: "CLOSED" },
        3
    ),
    new Rule(
        "R5",
        "Resident A",
        { variable: "occupancy", operator: "==", value: 0 },
        { device: "lights", value: "OFF" },
        6
    )
];

const engine = new RuleEngine(rules, environment);

// The most recent run() result. Re-sent to every client on every update
// so the frontend never has to compute rule outcomes itself.
let lastRunResult = {
    cycle: { detected: false, path: null },
    activeRuleIds: [],
    conflicts: [],
    logs: [
        { type: "SYSTEM", message: "SmartDorm rule engine initialized." }
    ]
};

function serializeRule(rule) {
    return {
        id: rule.id,
        resident: rule.resident,
        condition: rule.condition,
        action: rule.action,
        priority: rule.basePriority
    };
}

function buildBroadcastPayload() {
    return {
        type: "state",
        data: {
            environment: environment.getState(),
            rules: engine.rules.map(serializeRule),
            edges: engine.graph.getEdges(),
            cycle: lastRunResult.cycle,
            activeRuleIds: lastRunResult.activeRuleIds,
            conflicts: lastRunResult.conflicts,
            logs: lastRunResult.logs
        }
    };
}

function broadcast(wss, payload) {
    const message = JSON.stringify(payload);

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

const wss = new WebSocket.Server({
    port: 8080
});

console.log("SmartDorm WebSocket server running on port 8080");

wss.on("connection", (ws) => {
    console.log("Frontend connected");

    // Send the full current picture immediately on connect.
    ws.send(JSON.stringify(buildBroadcastPayload()));

    ws.on("message", (message) => {
        try {
            const data = JSON.parse(message);

            console.log("Message received:", data);

            if (data.type === "sensorUpdate") {
                // environment.updateState() emits "stateChanged" synchronously,
                // which the listener below picks up to run the engine and
                // broadcast the result — including to this same socket.
                environment.updateState(
                    data.variable,
                    data.value
                );

                return;
            }

            if (data.type === "addRule") {
                const newRule = new Rule(
                    data.id,
                    data.resident,
                    data.condition,
                    data.action,
                    Number(data.priority) || 1
                );

                engine.addRule(newRule);
                lastRunResult = engine.run(environment.getState());

                broadcast(wss, buildBroadcastPayload());
                return;
            }

            if (data.type === "removeRule") {
                engine.removeRule(data.id);
                lastRunResult = engine.run(environment.getState());

                broadcast(wss, buildBroadcastPayload());
                return;
            }

            if (data.type === "runEngine") {
                // Manual re-evaluation trigger, useful right after adding a
                // rule when the environment itself hasn't changed.
                lastRunResult = engine.run(environment.getState());

                broadcast(wss, buildBroadcastPayload());
                return;
            }

        } catch (error) {
            console.log("Invalid message:", error.message);

            ws.send(JSON.stringify({
                type: "error",
                message: error.message
            }));
        }
    });

    ws.on("close", () => {
        console.log("Frontend disconnected");
    });
});

// React to environment changes: run the engine and broadcast its full
// decision (state, active rules, conflicts, cycle status, logs) to
// every connected client.
eventBus.on("stateChanged", (event) => {
    try {
        lastRunResult = engine.handleEvent(event);
    } catch (error) {
        // Defensive: the engine itself should never throw (cycles are
        // caught internally), but never let an unexpected error crash
        // the server or leave clients without a response.
        lastRunResult = {
            cycle: { detected: false, path: null },
            activeRuleIds: [],
            conflicts: [],
            logs: [
                { type: "ERROR", message: `Engine error: ${error.message}` }
            ]
        };
    }

    broadcast(wss, buildBroadcastPayload());
});