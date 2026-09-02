let socket = null;

export function connectWebSocket({ onMessage, onOpen, onClose, onError } = {}) {
  socket = new WebSocket("ws://localhost:8080");

  socket.onopen = () => {
    console.log("Connected to SmartDorm backend");
    if (onOpen) onOpen();
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (onMessage) onMessage(data);
    } catch (error) {
      console.error("Invalid message from backend:", error);
    }
  };

  socket.onclose = () => {
    console.log("Disconnected from SmartDorm backend");
    if (onClose) onClose();
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
    if (onError) onError(error);
  };

  return socket;
}

function send(payload) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
    return true;
  }

  console.warn("WebSocket is not open. Message not sent:", payload);
  return false;
}

// Tell the backend a sensor/device changed. The backend decides what
// happens next (which rules fire, which conflicts arise, etc.) and
// broadcasts the result back to every connected client.
export function sendSensorUpdate(variable, value) {
  return send({ type: "sensorUpdate", variable, value });
}

// Ask the backend to add a new rule to the live dependency graph.
export function sendAddRule(rule) {
  return send({ type: "addRule", ...rule });
}

export function sendRemoveRule(id) {
  return send({ type: "removeRule", id });
}

// Force the backend to re-evaluate the current state (useful right
// after adding a rule, when the environment itself hasn't changed).
export function sendRunEngine() {
  return send({ type: "runEngine" });
}