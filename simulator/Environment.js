const EventBus = require("./EventBus");

class Environment {
    constructor(eventBus) {
        this.eventBus = eventBus;

        this.state = {
            temperature: 28,
            occupancy: 2,
            window: "CLOSED",
            time: 21,
            lights: "OFF",
            AC: "OFF",
            FAN: "OFF",
            BLINDS: "OPEN"
        };
    }

    getState() {
        return { ...this.state };
    }
setDeviceState(device, value) {
    if (!(device in this.state)) {
        throw new Error(
            `Unknown device: ${device}`
        );
    }

    const oldValue = this.state[device];

    if (oldValue === value) {
        return;
    }

    this.state[device] = value;

    console.log(
        `Device changed → ${device}: ${oldValue} → ${value}`
    );

    this.eventBus.emit("deviceChanged", {
        device,
        oldValue,
        newValue: value
    });
}
    updateState(variable, value) {
        if (!(variable in this.state)) {
            throw new Error(
                `Unknown environment variable: ${variable}`
            );
        }

        const oldValue = this.state[variable];

        this.state[variable] = value;

        console.log(
            `Environment changed → ${variable}: ${oldValue} → ${value}`
        );

        this.eventBus.emit("stateChanged", {
            variable,
            oldValue,
            newValue: value
        });
    }
}

module.exports = Environment;