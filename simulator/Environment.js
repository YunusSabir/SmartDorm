class Environment {
    constructor() {
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

    updateState(variable, value) {
        if (!(variable in this.state)) {
            throw new Error(`Unknown environment variable: ${variable}`);
        }

        this.state[variable] = value;

        console.log(
            `Environment changed → ${variable} = ${value}`
        );
    }
}

module.exports = Environment;