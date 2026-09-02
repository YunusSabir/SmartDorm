class CycleDetector {
    constructor(graph) {
        this.graph = graph;
    }

    hasCycle() {
        const visited = new Set();
        const recursionStack = new Set();

        for (const node of this.graph.graph.keys()) {
            if (this.detectCycle(node, visited, recursionStack)) {
                return true;
            }
        }

        return false;
    }

    detectCycle(node, visited, recursionStack) {
        if (recursionStack.has(node)) {
            return true;
        }

        if (visited.has(node)) {
            return false;
        }

        visited.add(node);
        recursionStack.add(node);

        const neighbors = this.graph.graph.get(node) || [];

        for (const neighbor of neighbors) {
            if (this.detectCycle(neighbor, visited, recursionStack)) {
                return true;
            }
        }

        recursionStack.delete(node);

        return false;
    }

    // Returns the actual cycle as an ordered array of rule ids
    // (e.g. ["R3", "R4", "R6", "R3"]), or null if the graph is acyclic.
    // Used so the UI can show *which* rules form the loop, not just
    // a yes/no flag.
    findCyclePath() {
        const visited = new Set();
        const recursionStack = new Set();
        const path = [];

        const dfs = (node) => {
            if (recursionStack.has(node)) {
                const start = path.indexOf(node);
                return start >= 0 ? [...path.slice(start), node] : [node, node];
            }

            if (visited.has(node)) {
                return null;
            }

            visited.add(node);
            recursionStack.add(node);
            path.push(node);

            const neighbors = this.graph.graph.get(node) || [];

            for (const neighbor of neighbors) {
                const result = dfs(neighbor);

                if (result) {
                    return result;
                }
            }

            path.pop();
            recursionStack.delete(node);

            return null;
        };

        for (const node of this.graph.graph.keys()) {
            const result = dfs(node);

            if (result) {
                return result;
            }
        }

        return null;
    }
}

module.exports = CycleDetector;