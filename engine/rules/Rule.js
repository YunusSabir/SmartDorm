class Rule {
    constructor(id, resident, condition, action, basePriority) {
        this.id = id;
        this.resident = resident;
        this.condition = condition;
        this.action = action;
        this.basePriority = basePriority;
        this.overrideHistory = 0;
    }
}

module.exports = Rule;