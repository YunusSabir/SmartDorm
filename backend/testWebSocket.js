const WebSocket = require("ws");

const ws = new WebSocket("ws://localhost:8080");

ws.on("open", () => {
    console.log("Connected to SmartDorm WebSocket");

    ws.send(JSON.stringify({
        type: "sensorUpdate",
        variable: "temperature",
        value: 32
    }));
});

ws.on("message", (message) => {
    console.log("Server response:");
    console.log(JSON.parse(message));

    ws.close();
});

ws.on("close", () => {
    console.log("Connection closed");
});