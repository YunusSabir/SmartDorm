let socket = null;

export function connectWebSocket(onMessage) {
    socket = new WebSocket("ws://localhost:8080");

    socket.onopen = () => {
        console.log("Connected to SmartDorm backend");
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        console.log("Backend message:", data);

        onMessage(data);
    };

    socket.onclose = () => {
        console.log("Disconnected from SmartDorm backend");
    };

    socket.onerror = (error) => {
        console.error("WebSocket error:", error);
    };
}

export function sendSensorUpdate(variable, value) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: "sensorUpdate",
            variable,
            value
        }));
    }
}