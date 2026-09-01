const DependencyGraph = require("../graph/DependencyGraph");
const CycleDetector = require("./CycleDetector");

const graph = new DependencyGraph();

graph.addDependency("R1", "R2");
graph.addDependency("R2", "R3");

const detector = new CycleDetector(graph);

console.log("Graph has cycle:", detector.hasCycle());