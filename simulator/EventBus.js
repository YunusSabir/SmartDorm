class EventBus {
    constructor() {
        this.listeners = {};
    }

    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }

        this.listeners[event].push(callback);
    }

    emit(event, data) {
        const callbacks = this.listeners[event] || [];

        for (const callback of callbacks) {
            callback(data);
        }
    }
}

module.exports = EventBus;