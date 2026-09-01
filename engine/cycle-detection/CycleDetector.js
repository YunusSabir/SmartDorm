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
}

module.exports = CycleDetector;