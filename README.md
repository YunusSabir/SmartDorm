#SmartDorm — Multi-Resident Conflict-Aware Automation Engine

SmartDorm is a conflict-aware automation system designed for shared smart spaces such as dormitories, apartments, offices, and other multi-user environments.

Unlike traditional smart automation systems designed around a single user, SmartDorm considers the possibility that multiple residents may have competing preferences and automation rules.

The system detects conflicting rules, resolves them using adaptive priority and fairness mechanisms, manages rule dependencies using graphs, prevents circular automation, and provides explanations for automation decisions.

Problem Statement

Traditional smart home and IoT automation systems generally assume a single owner or user.

For example:

IF temperature > 30°C → Turn AC ON

This model becomes problematic in shared environments.

Consider two residents:

Resident A
IF temperature > 30°C
THEN AC → ON
Resident B
IF temperature > 28°C
THEN AC → OFF

When the temperature becomes 32°C, both rules are triggered.

The system now has conflicting instructions:

Resident A → AC ON
Resident B → AC OFF

A traditional system may use static priorities, where the same resident always wins.

This can create an unfair system where one stakeholder is repeatedly overridden.

SmartDorm addresses this problem using conflict detection, adaptive priority, fairness tracking, and explainable arbitration.

Proposed Solution

SmartDorm is a multi-resident automation engine that treats automation in shared spaces as competing stakeholder intent.

The system:

Evaluates automation rules.
Detects conflicting actions.
Resolves conflicts using adaptive priorities.
Tracks repeated overrides.
Provides fairness adjustments.
Executes dependent rules in the correct order.
Detects circular dependencies.
Explains why a particular automation decision was made.
Communicates with a live frontend using WebSockets.
Core Innovation
Adaptive Priority and Fairness

Traditional priority-based arbitration uses static priorities.

For example:

Resident A Priority = 5
Resident B Priority = 7

Resident B will always win.

SmartDorm introduces adaptive priority.

When a resident repeatedly loses automation conflicts, their effective priority can be adjusted to improve fairness.

Effective Priority
Effective Priority =
Base Priority + Fairness Adjustment

Example:

Resident A

Base Priority: 5
Previous Overrides: 3
Fairness Adjustment: +1.5

Effective Priority: 6.5

This mechanism prevents the same resident from being permanently ignored while maintaining priority-based decision making.

Key Features
1. Multi-Resident Automation

Multiple residents can create automation rules for the same smart environment.

Example:

Resident A:
Temperature > 30 → AC ON

Resident B:
Temperature > 28 → AC OFF
2. Conflict Detection

The system detects conflicts when multiple triggered rules attempt to control the same device with different actions.

Example:

Rule R1 → AC ON
Rule R2 → AC OFF

Since both rules control the AC differently, SmartDorm identifies this as a conflict.

3. Adaptive Conflict Arbitration

Conflicts are resolved by comparing effective priorities.

Rule A
Base Priority: 5
Fairness Adjustment: 0
Effective Priority: 5

Rule B
Base Priority: 7
Fairness Adjustment: 0
Effective Priority: 7

Winner:

Rule B
4. Resident-Level Fairness Tracking

Override history is tracked to support fairness in conflict resolution.

Example:

Resident A has been overridden multiple times.

The system can use this history when calculating effective priority.

5. Explainable Automation

The system provides an explanation for arbitration decisions.

Example:

CONFLICT DETECTED

Device: AC

Resident A
Action: AC ON
Base Priority: 5
Fairness Adjustment: 0
Effective Priority: 5

Resident B
Action: AC OFF
Base Priority: 7
Fairness Adjustment: 0
Effective Priority: 7

WINNER: Resident B

Reason:
Higher effective priority (7 > 5)

This makes the automation process transparent and explainable.

6. Rule Dependency Graph

Rules may depend on the execution of other rules.

Example:

R1 → R2 → R3

SmartDorm represents these dependencies as a directed graph.

The graph determines the correct execution order.

Example output:

R1 → R2
R2 → R3
R3 →

Execution Order:

R1
R2
R3
7. Cycle Detection

Automation rules can accidentally create circular dependencies.

Example:

R1 → R2
R2 → R3
R3 → R1

This can cause infinite automation loops.

SmartDorm uses graph traversal techniques to detect cycles and prevent circular automation.

8. Event-Driven Environment

The smart environment is simulated using an event-driven architecture.

Environmental changes generate events.

Example:

Temperature: 28 → 32

This generates an environment event which triggers the rule engine.

9. Real-Time Communication

SmartDorm uses WebSockets to connect the backend automation engine with the frontend dashboard.

React Frontend
        ↕
    WebSocket
        ↕
 Node.js Backend
        ↓
 Environment
        ↓
   Event Bus
        ↓
   Rule Engine
        ↓
Conflict Resolver

This enables real-time updates between the simulation and dashboard.

System Architecture
                         ┌─────────────────────┐
                         │   React Frontend    │
                         │                     │
                         │ Dashboard           │
                         │ Environment Control │
                         │ Rule Visualization  │
                         │ Conflict Display    │
                         └──────────┬──────────┘
                                    │
                                    │ WebSocket
                                    │
                         ┌──────────▼──────────┐
                         │   Node.js Server    │
                         │                     │
                         │ WebSocket Server    │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    Environment      │
                         │                     │
                         │ Temperature         │
                         │ Occupancy           │
                         │ Window              │
                         │ Time                │
                         │ Device States       │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │      Event Bus      │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    Rule Engine      │
                         │                     │
                         │ Evaluate Rules      │
                         │ Execute Rules       │
                         └──────────┬──────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
         ┌────────────────────┐         ┌────────────────────┐
         │ Dependency Graph   │         │ Conflict Resolver  │
         │                    │         │                    │
         │ DFS                │         │ Adaptive Priority  │
         │ Topological Order  │         │ Fairness           │
         │ Cycle Detection    │         │ Arbitration        │
         └────────────────────┘         └────────────────────┘
Project Structure
SmartDorm/
│
├── backend/
│   ├── server.js
│   ├── testWebSocket.js
│   ├── package.json
│   └── package-lock.json
│
├── engine/
│   │
│   ├── RuleEngine.js
│   │
│   ├── rules/
│   │   ├── Rule.js
│   │   └── RuleEvaluator.js
│   │
│   ├── graph/
│   │   ├── DependencyGraph.js
│   │   └── testGraph.js
│   │
│   └── arbitration/
│       ├── ConflictResolver.js
│       └── testConflict.js
│
├── simulator/
│   ├── Environment.js
│   ├── EventBus.js
│   └── testEvents.js
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── .gitignore
└── README.md
Technology Stack
Backend
Node.js
JavaScript
WebSocket (ws package)
Frontend
React
Vite
JavaScript
Core Algorithms and Concepts
Graph representation
Depth First Search (DFS)
Topological ordering
Cycle detection
Conflict detection
Priority-based arbitration
Adaptive fairness adjustment
Event-driven architecture
Rule Structure

Each automation rule contains information about the resident, condition, action, and priority.

Example:

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

Example rule:

new Rule(
    "R1",
    "Resident A",
    {
        variable: "temperature",
        operator: ">",
        value: 30
    },
    {
        device: "AC",
        value: "ON"
    },
    5
);
Environment State

The simulator currently supports environmental variables such as:

temperature
occupancy
window
time

Example environment state:

{
    temperature: 28,
    occupancy: 2,
    window: "CLOSED",
    time: 21,

    lights: "OFF",
    AC: "OFF",
    FAN: "OFF",
    BLINDS: "OPEN"
}
Rule Evaluation

A rule is evaluated against the current environment state.

Example condition:

temperature > 30

If:

temperature = 32

The rule condition evaluates to:

TRUE

The corresponding action can then be executed.

Conflict Detection Example

Consider two rules:

Rule R1
Resident: Resident A

IF temperature > 30

THEN AC → ON

Priority: 5
Rule R2
Resident: Resident B

IF temperature > 28

THEN AC → OFF

Priority: 7

When:

temperature = 32

Both rules trigger.

The system detects:

Conflict on AC

The effective priorities are:

R1 = 5
R2 = 7

Result:

Winner: R2

Final action:

AC → OFF
WebSocket Communication

The frontend connects to:

ws://localhost:8080
Frontend to Backend

Sensor updates are sent in the following format:

{
    "type": "sensorUpdate",
    "variable": "temperature",
    "value": 32
}

Other examples:

{
    "type": "sensorUpdate",
    "variable": "occupancy",
    "value": 1
}
{
    "type": "sensorUpdate",
    "variable": "window",
    "value": "OPEN"
}
Backend to Frontend

Current state is sent in the following format:

{
    "type": "state",
    "data": {
        "temperature": 32,
        "occupancy": 2,
        "window": "CLOSED",
        "AC": "OFF"
    }
}
Installation
Clone the Repository
git clone https://github.com/YunusSabir/SmartDorm.git

Move into the project:

cd SmartDorm
Backend Setup

Move into the backend folder:

cd backend

Install dependencies:

npm install

Start the WebSocket server:

node server.js

Expected output:

SmartDorm WebSocket server running on port 8080
Frontend Setup

Open another terminal.

Move into the frontend folder:

cd frontend

Install dependencies:

npm install

Start the development server:

npm run dev

Vite will provide a local URL similar to:

http://localhost:5173

Open this URL in your browser.

Running the Complete System

Open two terminals.

Terminal 1 — Backend
cd backend
node server.js
Terminal 2 — Frontend
cd frontend
npm run dev

The frontend communicates with the backend using:

ws://localhost:8080
Testing
Test Dependency Graph

From the project root:

node engine/graph/testGraph.js

Example output:

R1 → R2
R2 → R3
R3 →

Execution order:

[ 'R1', 'R2', 'R3' ]
Test Conflict Resolution
node engine/arbitration/testConflict.js

Example:

Conflict on: AC

Rule A: R1
Rule B: R2

Effective priorities:

R1: 5
R2: 7

Winner: R2
Test Environment Events
node simulator/testEvents.js

Example:

Environment changed → temperature: 28 → 32

EVENT RECEIVED:

{
    variable: 'temperature',
    oldValue: 28,
    newValue: 32
}
Test Rule Engine Arbitration
node engine/testArbitration.js

Example:

Changing temperature to 32...

Environment changed → temperature: 28 → 32

Processing event: temperature = 32

CONFLICT on AC

Winner: R2

Effective priorities:
{ R1: 5, R2: 7 }

R2 triggered → AC = OFF
Test WebSocket

Start the backend first:

cd backend
node server.js

Open another terminal:

cd backend
node testWebSocket.js

Example:

Connected to SmartDorm WebSocket

Server response:

{
    type: 'state'
}
Current Development Status
Completed
 Multi-resident rule model
 Rule evaluation engine
 Environment simulator
 Event-driven architecture
 Dependency graph
 Graph traversal
 Rule execution ordering
 Conflict detection
 Priority-based arbitration
 Fairness tracking
 Explainable conflict decisions
 WebSocket server
 Backend WebSocket testing
 Frontend dashboard
 Git branch integration