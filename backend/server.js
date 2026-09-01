const WebSocket = require("ws");

const wss = new WebSocket.Server({
    port: 8080
});

console.log("WebSocket server running on port 8080");

wss.on("connection", (ws) => {
    console.log("Frontend connected");

    ws.send(JSON.stringify({
        type: "connection",
        message: "Connected to SmartDorm"
    }));

    ws.on("message", (message) => {
        try {
            const data = JSON.parse(message);

            console.log("Message received:");
            console.log(data);

            ws.send(JSON.stringify({
                type: "acknowledgement",
                message: "Message received"
            }));

        } catch (error) {
            console.log("Invalid message received");
        }
    });

    ws.on("close", () => {
        console.log("Frontend disconnected");
    });
});