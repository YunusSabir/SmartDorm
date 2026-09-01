import "./App.css";
import { useMemo, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
} from "@xyflow/react";

const initialEnvironment = {
  time: "22:05",
  occupancy: 1,
  temperature: 29,
  window: "OPEN",
  lights: "ON",
  ac: "OFF",
  fan: "OFF",
  home: true,
};

const initialRules = [
  {
    id: "R1",
    resident: "Resident A",
    condition: "home == true AND time > 21:00",
    action: "lights = ON",
    priority: 5,
  },
  {
    id: "R2",
    resident: "Building Policy",
    condition: "occupancy < 2 AND time > 22:00",
    action: "lights = OFF",
    priority: 8,
  },
  {
    id: "R3",
    resident: "Resident B",
    condition: "temperature > 28",
    action: "AC = ON",
    priority: 5,
  },
  {
    id: "R4",
    resident: "Building Policy",
    condition: "AC == ON",
    action: "fan = ON",
    priority: 4,
  },
  {
    id: "R5",
    resident: "Building Policy",
    condition: "window == OPEN",
    action: "AC = OFF",
    priority: 9,
  },
];

const initialLogs = [
  {
    id: 1,
    type: "SYSTEM",
    message: "SmartDorm rule engine initialized.",
  },
  {
    id: 2,
    type: "CHAIN",
    message: "R3 → AC ON → R4 → FAN ON",
  },
  {
    id: 3,
    type: "CONFLICT",
    message:
      "R1 and R2 request opposite LIGHTS states. R2 wins because priority 8 > 5.",
  },
];

function normalizeDevice(device) {
  const value = device.trim().toLowerCase();

  if (value === "light" || value === "lights") {
    return "lights";
  }

  if (value === "airconditioner") {
    return "ac";
  }

  return value;
}

function getActionParts(action) {
  const match = action.match(
    /^\s*([a-zA-Z_]+)\s*=\s*([a-zA-Z0-9_]+)\s*$/
  );

  if (!match) {
    return null;
  }

  return {
    device: normalizeDevice(match[1]),
    value: match[2].toUpperCase(),
  };
}

function getConditionDevices(condition) {
  const knownDevices = [
    "temperature",
    "occupancy",
    "window",
    "lights",
    "light",
    "ac",
    "fan",
    "home",
    "time",
  ];

  return [
    ...new Set(
      knownDevices
        .filter((device) =>
          new RegExp(`\\b${device}\\b`, "i").test(
            condition
          )
        )
        .map(normalizeDevice)
    ),
  ];
}

function buildDependencies(rules) {
  const edges = [];

  for (const sourceRule of rules) {
    const sourceAction = getActionParts(
      sourceRule.action
    );

    if (!sourceAction) {
      continue;
    }

    for (const targetRule of rules) {
      if (sourceRule.id === targetRule.id) {
        continue;
      }

      const conditionDevices =
        getConditionDevices(
          targetRule.condition
        );

      if (
        conditionDevices.includes(
          sourceAction.device
        )
      ) {
        edges.push({
          id: `${sourceRule.id}-${targetRule.id}`,
          source: sourceRule.id,
          target: targetRule.id,
          animated: true,
        });
      }
    }
  }

  return edges;
}

function detectCycle(rules, edges) {
  const graph = {};

  rules.forEach((rule) => {
    graph[rule.id] = [];
  });

  edges.forEach((edge) => {
    if (graph[edge.source]) {
      graph[edge.source].push(edge.target);
    }
  });

  const visited = new Set();
  const recursionStack = new Set();
  const path = [];

  function dfs(node) {
    if (recursionStack.has(node)) {
      const start = path.indexOf(node);

      if (start >= 0) {
        return [
          ...path.slice(start),
          node,
        ];
      }

      return [node, node];
    }

    if (visited.has(node)) {
      return null;
    }

    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    for (const next of graph[node]) {
      const result = dfs(next);

      if (result) {
        return result;
      }
    }

    path.pop();
    recursionStack.delete(node);

    return null;
  }

  for (const rule of rules) {
    const result = dfs(rule.id);

    if (result) {
      return result;
    }
  }

  return null;
}

function compareTime(a, b) {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);

  return ah * 60 + am - (bh * 60 + bm);
}

function getEnvironmentValue(variable, environment) {
  const key = normalizeDevice(variable);

  return environment[key];
}

function evaluateSimpleCondition(
  expression,
  environment
) {
  const match = expression.match(
    /^\s*([a-zA-Z_]+)\s*(==|!=|>=|<=|>|<)\s*(.+?)\s*$/
  );

  if (!match) {
    return false;
  }

  const variable = match[1];
  const operator = match[2];
  let expected = match[3].trim();

  const actual = getEnvironmentValue(
    variable,
    environment
  );

  if (actual === undefined) {
    return false;
  }

  if (
    (expected.startsWith('"') &&
      expected.endsWith('"')) ||
    (expected.startsWith("'") &&
      expected.endsWith("'"))
  ) {
    expected = expected.slice(1, -1);
  }

  if (variable.toLowerCase() === "time") {
    const difference = compareTime(
      String(actual),
      expected
    );

    if (operator === "==") return difference === 0;
    if (operator === "!=") return difference !== 0;
    if (operator === ">") return difference > 0;
    if (operator === "<") return difference < 0;
    if (operator === ">=") return difference >= 0;
    if (operator === "<=") return difference <= 0;
  }

  if (
    typeof actual === "number" &&
    !Number.isNaN(Number(expected))
  ) {
    expected = Number(expected);
  }

  if (
    typeof expected === "string" &&
    expected.toLowerCase() === "true"
  ) {
    expected = true;
  } else if (
    typeof expected === "string" &&
    expected.toLowerCase() === "false"
  ) {
    expected = false;
  }

  if (operator === "==") {
    return actual === expected;
  }

  if (operator === "!=") {
    return actual !== expected;
  }

  if (operator === ">") {
    return actual > expected;
  }

  if (operator === "<") {
    return actual < expected;
  }

  if (operator === ">=") {
    return actual >= expected;
  }

  if (operator === "<=") {
    return actual <= expected;
  }

  return false;
}

function evaluateCondition(
  condition,
  environment
) {
  const orParts = condition
    .split(/\s+OR\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);

  return orParts.some((orPart) => {
    const andParts = orPart
      .split(/\s+AND\s+/i)
      .map((part) => part.trim())
      .filter(Boolean);

    return andParts.every((part) =>
      evaluateSimpleCondition(
        part,
        environment
      )
    );
  });
}

function RuleNode({ data }) {
  return (
    <div
      className={`rule-node ${
        data.blocked
          ? "rule-node-cycle"
          : ""
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="handle"
      />

      <div className="rule-node-header">
        <strong>{data.id}</strong>

        <span className="priority-badge">
          P{data.priority}
        </span>
      </div>

      <div className="rule-resident">
        {data.resident}
      </div>

      <div className="rule-condition">
        IF {data.condition}
      </div>

      <div className="rule-action">
        THEN {data.action}
      </div>

      {data.blocked && (
        <div className="cycle-node-warning">
          ⚠ CYCLE MEMBER
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="handle"
      />
    </div>
  );
}

const nodeTypes = {
  rule: RuleNode,
};

function Card({ children, className = "" }) {
  return (
    <section className={`card ${className}`}>
      {children}
    </section>
  );
}

function StateBadge({ value }) {
  const active =
    value === "ON" ||
    value === "OPEN";

  return (
    <span
      className={`state-badge ${
        active
          ? "state-active"
          : "state-inactive"
      }`}
    >
      {value}
    </span>
  );
}

function DeviceCard({
  icon,
  name,
  value,
  onClick,
}) {
  return (
    <button
      type="button"
      className="device-card"
      onClick={onClick}
    >
      <span className="device-icon">
        {icon}
      </span>

      <span className="device-name">
        {name}
      </span>

      <StateBadge value={value} />
    </button>
  );
}

export default function App() {
  const [environment, setEnvironment] =
    useState(initialEnvironment);

  const [rules, setRules] =
    useState(initialRules);

  const [logs, setLogs] =
    useState(initialLogs);

  const [condition, setCondition] =
    useState("temperature > 30");

  const [action, setAction] =
    useState("fan = ON");

  const [resident, setResident] =
    useState("Resident A");

  const [priority, setPriority] =
    useState(5);

  const [lastExecution, setLastExecution] =
    useState(null);

  const edges = useMemo(
    () => buildDependencies(rules),
    [rules]
  );

  const cyclePath = useMemo(
    () => detectCycle(rules, edges),
    [rules, edges]
  );

  const cycleDetected =
    cyclePath !== null;

  const cycleRuleIds = useMemo(
    () => new Set(cyclePath || []),
    [cyclePath]
  );

  const nodes = useMemo(
    () =>
      rules.map((rule, index) => ({
        id: rule.id,
        type: "rule",
        position: {
          x: (index % 3) * 310,
          y:
            Math.floor(index / 3) *
            250,
        },
        data: {
          ...rule,
          blocked:
            cycleRuleIds.has(rule.id),
        },
      })),
    [rules, cycleRuleIds]
  );

  const activeRules = useMemo(
    () =>
      rules.filter((rule) =>
        evaluateCondition(
          rule.condition,
          environment
        )
      ),
    [rules, environment]
  );

  const conflicts = useMemo(() => {
    const result = [];

    for (
      let i = 0;
      i < activeRules.length;
      i++
    ) {
      const actionA =
        getActionParts(
          activeRules[i].action
        );

      if (!actionA) {
        continue;
      }

      for (
        let j = i + 1;
        j < activeRules.length;
        j++
      ) {
        const actionB =
          getActionParts(
            activeRules[j].action
          );

        if (!actionB) {
          continue;
        }

        if (
          actionA.device ===
            actionB.device &&
          actionA.value !==
            actionB.value
        ) {
          const winner =
            activeRules[i].priority >=
            activeRules[j].priority
              ? activeRules[i]
              : activeRules[j];

          const loser =
            winner.id ===
            activeRules[i].id
              ? activeRules[j]
              : activeRules[i];

          result.push({
            first: activeRules[i],
            second: activeRules[j],
            winner,
            loser,
            device: actionA.device,
          });
        }
      }
    }

    return result;
  }, [activeRules]);

  function addLog(type, message) {
    setLogs((previous) => [
      {
        id:
          Date.now() +
          Math.random(),
        type,
        message,
      },
      ...previous,
    ]);
  }

  function changeTemperature(
    amount
  ) {
    setEnvironment((previous) => ({
      ...previous,
      temperature: Math.max(
        10,
        Math.min(
          45,
          previous.temperature +
            amount
        )
      ),
    }));
  }

  function changeOccupancy(
    amount
  ) {
    setEnvironment((previous) => ({
      ...previous,
      occupancy: Math.max(
        0,
        Math.min(
          10,
          previous.occupancy +
            amount
        )
      ),
    }));
  }

  function toggleWindow() {
    setEnvironment((previous) => ({
      ...previous,
      window:
        previous.window === "OPEN"
          ? "CLOSED"
          : "OPEN",
    }));
  }

  function toggleLights() {
    setEnvironment((previous) => ({
      ...previous,
      lights:
        previous.lights === "ON"
          ? "OFF"
          : "ON",
    }));
  }

  function toggleAC() {
    setEnvironment((previous) => ({
      ...previous,
      ac:
        previous.ac === "ON"
          ? "OFF"
          : "ON",
    }));
  }

  function toggleFan() {
    setEnvironment((previous) => ({
      ...previous,
      fan:
        previous.fan === "ON"
          ? "OFF"
          : "ON",
    }));
  }

  function runRuleEngine() {
    if (cycleDetected) {
      addLog(
        "CYCLE",
        `Execution blocked. Circular dependency detected: ${cyclePath.join(
          " → "
        )}`
      );

      setLastExecution({
        success: false,
        message:
          "Execution blocked because the dependency graph contains a cycle.",
      });

      return;
    }

    let currentEnvironment = {
      ...environment,
    };

    const firedRules =
      new Set();

    const executionLogs = [];

    const MAX_STEPS =
      Math.max(1, rules.length * 3);

    let steps = 0;

    while (
      steps < MAX_STEPS
    ) {
      steps++;

      const candidates =
        rules.filter(
          (rule) =>
            !firedRules.has(
              rule.id
            ) &&
            evaluateCondition(
              rule.condition,
              currentEnvironment
            )
        );

      if (
        candidates.length === 0
      ) {
        break;
      }

      const actionsByDevice =
        {};

      for (const rule of candidates) {
        const parsed =
          getActionParts(
            rule.action
          );

        if (!parsed) {
          continue;
        }

        if (
          !actionsByDevice[
            parsed.device
          ]
        ) {
          actionsByDevice[
            parsed.device
          ] = [];
        }

        actionsByDevice[
          parsed.device
        ].push({
          rule,
          action: parsed,
        });
      }

      let changed = false;

      for (const device of Object.keys(
        actionsByDevice
      )) {
        const deviceRules =
          actionsByDevice[
            device
          ];

        deviceRules.sort(
          (a, b) =>
            b.rule.priority -
            a.rule.priority
        );

        const winner =
          deviceRules[0];

        const previousValue =
          currentEnvironment[
            device
          ];

        currentEnvironment = {
          ...currentEnvironment,
          [device]:
            winner.action.value,
        };

        firedRules.add(
          winner.rule.id
        );

        if (
          previousValue !==
          winner.action.value
        ) {
          changed = true;
        }

        executionLogs.push({
          type: "RULE",
          message:
            `${winner.rule.id} fired: IF ${winner.rule.condition} → THEN ${winner.rule.action}`,
        });

        if (
          deviceRules.length > 1
        ) {
          for (
            const loser of deviceRules.slice(
              1
            )
          ) {
            firedRules.add(
              loser.rule.id
            );

            executionLogs.push({
              type: "CONFLICT",
              message:
                `Conflict on ${device.toUpperCase()}: ${winner.rule.id} wins over ${loser.rule.id} because priority ${winner.rule.priority} > ${loser.rule.priority}.`,
            });
          }
        }
      }

      if (!changed) {
        break;
      }
    }

    const ruleExecutions =
      executionLogs.filter(
        (log) =>
          log.type === "RULE"
      );

    if (
      ruleExecutions.length >
      1
    ) {
      executionLogs.push({
        type: "CHAIN",
        message:
          `Chained execution completed: ${ruleExecutions
            .map(
              (log) =>
                log.message.split(
                  " "
                )[0]
            )
            .join(" → ")}`,
      });
    }

    if (
      executionLogs.length ===
      0
    ) {
      executionLogs.push({
        type: "SYSTEM",
        message:
          "No rule conditions are currently true.",
      });
    }

    setEnvironment(
      currentEnvironment
    );

    setLogs((previous) => [
      ...executionLogs.map(
        (log) => ({
          id:
            Date.now() +
            Math.random(),
          type: log.type,
          message:
            log.message,
        })
      ),
      ...previous,
    ]);

    setLastExecution({
      success: true,
      message: `${firedRules.size} rule(s) processed.`,
    });
  }

  function addRule(event) {
    event.preventDefault();

    const cleanCondition =
      condition.trim();

    const cleanAction =
      action.trim();

    if (!cleanCondition) {
      addLog(
        "ERROR",
        "Condition cannot be empty."
      );
      return;
    }

    if (
      !getActionParts(cleanAction)
    ) {
      addLog(
        "ERROR",
        "Invalid action. Use: device = VALUE"
      );
      return;
    }

    const nextNumber =
      Math.max(
        0,
        ...rules.map((rule) =>
          Number(
            rule.id.replace(
              "R",
              ""
            )
          )
        )
      ) + 1;

    const newRule = {
      id: `R${nextNumber}`,
      resident,
      condition:
        cleanCondition,
      action: cleanAction,
      priority:
        Number(priority) || 1,
    };

    const updatedRules = [
      ...rules,
      newRule,
    ];

    const updatedEdges =
      buildDependencies(
        updatedRules
      );

    const newCycle =
      detectCycle(
        updatedRules,
        updatedEdges
      );

    setRules(updatedRules);

    if (newCycle) {
      addLog(
        "CYCLE",
        `Cycle detected after adding ${newRule.id}: ${newCycle.join(
          " → "
        )}`
      );
    } else {
      addLog(
        "RULE",
        `${newRule.id} added live: IF ${newRule.condition} THEN ${newRule.action}`
      );
    }

    setCondition(
      "temperature > 30"
    );
    setAction("fan = ON");
    setPriority(5);
  }

  function injectCycleRule() {
    if (cycleDetected) {
      return;
    }

    const nextNumber =
      Math.max(
        0,
        ...rules.map((rule) =>
          Number(
            rule.id.replace(
              "R",
              ""
            )
          )
        )
      ) + 1;

    const cycleRule = {
      id: `R${nextNumber}`,
      resident: "Judge Test",
      condition: "fan == ON",
      action: "AC = ON",
      priority: 6,
    };

    const updatedRules = [
      ...rules,
      cycleRule,
    ];

    const updatedEdges =
      buildDependencies(
        updatedRules
      );

    const detectedCycle =
      detectCycle(
        updatedRules,
        updatedEdges
      );

    setRules(updatedRules);

    if (detectedCycle) {
      addLog(
        "CYCLE",
        `REAL circular dependency detected: ${detectedCycle.join(
          " → "
        )}`
      );
    }
  }

  function removeLastRule() {
    if (
      rules.length <=
      initialRules.length
    ) {
      addLog(
        "SYSTEM",
        "The five demonstration rules cannot be removed."
      );

      return;
    }

    const removed =
      rules[rules.length - 1];

    setRules((previous) =>
      previous.slice(0, -1)
    );

    addLog(
      "SYSTEM",
      `${removed.id} removed.`
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div>
            <h1>
              SmartDorm
            </h1>

            <p>
              Fairness-Aware
              Multi-Resident Rule
              Engine
            </p>
          </div>

          <div className="simulation-badge">
            SIMULATION MODE
          </div>
        </div>
      </header>

      <main className="main">

        {/* TOP DASHBOARD */}

        <div className="top-grid">

          {/* OCCUPANCY WITH + / - */}

          <Card>
            <div className="metric-label">
              👥 OCCUPANCY
            </div>

            <div className="metric-controls">

              <button
                type="button"
                className="round-button"
                onClick={() =>
                  changeOccupancy(-1)
                }
              >
                −
              </button>

              <strong>
                {environment.occupancy}
              </strong>

              <button
                type="button"
                className="round-button"
                onClick={() =>
                  changeOccupancy(1)
                }
              >
                +
              </button>

            </div>

            <div className="metric-subtitle">
              Residents inside
            </div>
          </Card>

          {/* TEMPERATURE WITH + / - */}

          <Card>
            <div className="metric-label">
              🌡️ TEMPERATURE
            </div>

            <div className="metric-controls">

              <button
                type="button"
                className="round-button"
                onClick={() =>
                  changeTemperature(-1)
                }
              >
                −
              </button>

              <strong>
                {environment.temperature}
                °C
              </strong>

              <button
                type="button"
                className="round-button"
                onClick={() =>
                  changeTemperature(1)
                }
              >
                +
              </button>

            </div>

            <div className="metric-subtitle">
              Simulated temperature
            </div>
          </Card>

          {/* ACTIVE RULES */}

          <Card>
            <div className="metric-label">
              ACTIVE RULES
            </div>

            <strong className="rule-count">
              {activeRules.length}
            </strong>

            <div className="metric-subtitle">
              Currently true
            </div>
          </Card>

        </div>

        {/* ENVIRONMENT + GRAPH */}

        <div className="environment-graph">

          <div className="left-column">

            <Card>

              <h2>
                Simulated Environment
              </h2>

              <p className="description">
                Change the environment
                without physical sensors.
              </p>

              <div className="control-group">
                <label>
                  TIME
                </label>

                <input
                  type="time"
                  value={
                    environment.time
                  }
                  onChange={(event) =>
                    setEnvironment(
                      (previous) => ({
                        ...previous,
                        time:
                          event.target
                            .value,
                      })
                    )
                  }
                />
              </div>

              <div className="control-group">

                <label>
                  🌡️ TEMPERATURE
                </label>

                <div className="inline-control">

                  <button
                    type="button"
                    className="small-button"
                    onClick={() =>
                      changeTemperature(
                        -1
                      )
                    }
                  >
                    −
                  </button>

                  <strong>
                    {
                      environment.temperature
                    }
                    °C
                  </strong>

                  <button
                    type="button"
                    className="small-button"
                    onClick={() =>
                      changeTemperature(
                        1
                      )
                    }
                  >
                    +
                  </button>

                </div>
              </div>

              <div className="control-group">

                <label>
                  👥 OCCUPANCY
                </label>

                <div className="inline-control">

                  <button
                    type="button"
                    className="small-button"
                    onClick={() =>
                      changeOccupancy(
                        -1
                      )
                    }
                  >
                    −
                  </button>

                  <strong>
                    {
                      environment.occupancy
                    }
                  </strong>

                  <button
                    type="button"
                    className="small-button"
                    onClick={() =>
                      changeOccupancy(
                        1
                      )
                    }
                  >
                    +
                  </button>

                </div>
              </div>

              <button
                type="button"
                className="window-control"
                onClick={
                  toggleWindow
                }
              >
                <span>
                  🪟 WINDOW
                </span>

                <StateBadge
                  value={
                    environment.window
                  }
                />
              </button>

              <button
                type="button"
                className="run-button"
                onClick={
                  runRuleEngine
                }
              >
                ▶ RUN RULE ENGINE
              </button>

              {lastExecution && (
                <div
                  className={`execution-result ${
                    lastExecution.success
                      ? "execution-success"
                      : "execution-error"
                  }`}
                >
                  {
                    lastExecution.message
                  }
                </div>
              )}

            </Card>

            {/* DEVICE STATES */}

            <Card>

              <h2>
                Device State
              </h2>

              <p className="description">
                Click a device to change
                its state.
              </p>

              <div className="device-grid">

                <DeviceCard
                  icon="💡"
                  name="LIGHTS"
                  value={
                    environment.lights
                  }
                  onClick={
                    toggleLights
                  }
                />

                <DeviceCard
                  icon="❄️"
                  name="AC"
                  value={
                    environment.ac
                  }
                  onClick={toggleAC}
                />

                <DeviceCard
                  icon="🌀"
                  name="FAN"
                  value={
                    environment.fan
                  }
                  onClick={
                    toggleFan
                  }
                />

                <DeviceCard
                  icon="🪟"
                  name="WINDOW"
                  value={
                    environment.window
                  }
                  onClick={
                    toggleWindow
                  }
                />

              </div>
            </Card>

          </div>

          {/* DEPENDENCY GRAPH */}

          <Card className="graph-card">

            <div className="section-header">

              <div>
                <h2>
                  Dependency Graph
                </h2>

                <p className="description">
                  Rules are connected when
                  one rule's action affects
                  another rule's condition.
                </p>
              </div>

              <span
                className={`graph-status ${
                  cycleDetected
                    ? "danger"
                    : "safe"
                }`}
              >
                {cycleDetected
                  ? "⚠ CYCLE DETECTED"
                  : "✓ GRAPH SAFE"}
              </span>

            </div>

            <div className="graph">

              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{
                  padding: 0.2,
                }}
                proOptions={{
                  hideAttribution: true,
                }}
              >
                <Background
                  gap={24}
                  color="#20344b"
                />

                <Controls />

                <MiniMap />
              </ReactFlow>

            </div>

          </Card>

        </div>

        {/* CONFLICT + CYCLE */}

        <div className="two-column">

          {/* CONFLICT */}

          <Card>

            <div className="section-header">

              <div>
                <h2>
                  Conflict Arbitration
                </h2>

                <p className="description">
                  Contradictory active rules
                  are resolved using priority.
                </p>
              </div>

              <span className="conflict-count">
                {conflicts.length}{" "}
                CONFLICT
                {conflicts.length === 1
                  ? ""
                  : "S"}
              </span>

            </div>

            {conflicts.length ===
            0 ? (
              <div className="empty-state">
                No active contradictory
                rules.
                <br />
                Change the environment
                or add a conflicting rule
                to test arbitration.
              </div>
            ) : (
              <div className="conflict-list">

                {conflicts.map(
                  (conflict, index) => (
                    <div
                      className="conflict"
                      key={`${conflict.first.id}-${conflict.second.id}-${index}`}
                    >

                      <div className="conflict-title">
                        CONTRADICTION ON{" "}
                        {conflict.device.toUpperCase()}
                      </div>

                      <div className="conflict-rules">

                        <div
                          className={`conflict-rule ${
                            conflict.winner.id ===
                            conflict.first.id
                              ? "winner"
                              : ""
                          }`}
                        >

                          <div className="rule-top">
                            <strong>
                              {
                                conflict
                                  .first
                                  .id
                              }
                            </strong>

                            {conflict.winner.id ===
                              conflict.first.id && (
                              <span>
                                WINNER
                              </span>
                            )}
                          </div>

                          <div>
                            {
                              conflict
                                .first
                                .action
                            }
                          </div>

                          <small>
                            Priority{" "}
                            {
                              conflict
                                .first
                                .priority
                            }
                          </small>

                        </div>

                        <div
                          className={`conflict-rule ${
                            conflict.winner.id ===
                            conflict.second.id
                              ? "winner"
                              : ""
                          }`}
                        >

                          <div className="rule-top">
                            <strong>
                              {
                                conflict
                                  .second
                                  .id
                              }
                            </strong>

                            {conflict.winner.id ===
                              conflict.second.id && (
                              <span>
                                WINNER
                              </span>
                            )}
                          </div>

                          <div>
                            {
                              conflict
                                .second
                                .action
                            }
                          </div>

                          <small>
                            Priority{" "}
                            {
                              conflict
                                .second
                                .priority
                            }
                          </small>

                        </div>

                      </div>

                      <div className="winner-explanation">

                        <strong>
                          🏆{" "}
                          {
                            conflict
                              .winner
                              .id
                          }{" "}
                          WINS
                        </strong>

                        <p>
                          {
                            conflict
                              .winner
                              .action
                          }
                        </p>

                        <span>
                          Why: priority{" "}
                          {
                            conflict
                              .winner
                              .priority
                          }{" "}
                          is higher than{" "}
                          {
                            conflict
                              .loser
                              .priority
                          }.
                        </span>

                      </div>

                    </div>
                  )
                )}

              </div>
            )}

          </Card>

          {/* CYCLE DETECTION */}

          <Card>

            <div className="section-header">

              <div>
                <h2>
                  Cycle Detection
                </h2>

                <p className="description">
                  DFS with a recursion stack
                  checks the live graph.
                </p>
              </div>

              <span
                className={`graph-status ${
                  cycleDetected
                    ? "danger"
                    : "safe"
                }`}
              >
                {cycleDetected
                  ? "BLOCKED"
                  : "SAFE"}
              </span>

            </div>

            {cycleDetected ? (
              <div className="cycle-warning">

                <strong>
                  ⚠ Circular dependency
                  detected
                </strong>

                <div className="cycle-path">
                  {
                    cyclePath.join(
                      " → "
                    )
                  }
                </div>

                <p>
                  Execution is blocked
                  so the engine cannot
                  enter an infinite loop.
                </p>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    removeLastRule
                  }
                >
                  REMOVE TEST RULE
                </button>

              </div>
            ) : (
              <>
                <div className="safe-box">

                  <strong>
                    ✓ No circular
                    dependency
                  </strong>

                  <p>
                    The current graph
                    contains no cycle.
                  </p>

                </div>

                <button
                  type="button"
                  className="danger-button"
                  onClick={
                    injectCycleRule
                  }
                >
                  ⚠ INJECT REAL CYCLE TEST
                </button>

                <div className="test-info">

                  <strong>
                    Cycle demonstration
                  </strong>

                  <p>
                    The button adds a
                    real rule:
                  </p>

                  <code>
                    IF fan == ON
                    <br />
                    THEN AC = ON
                  </code>

                  <p>
                    Existing R4:
                  </p>

                  <code>
                    IF AC == ON
                    <br />
                    THEN fan = ON
                  </code>

                  <p>
                    The dependency graph
                    becomes:
                  </p>

                  <code className="danger-text">
                    R4 → R6 → R4
                  </code>

                </div>
              </>
            )}

          </Card>

        </div>

        {/* ADD RULE */}

        <Card>

          <h2>
            Add Rule Live
          </h2>

          <p className="description">
            Add a rule while the system is
            running. The graph, conflicts
            and cycle detector update
            immediately.
          </p>

          <form
            className="rule-form"
            onSubmit={addRule}
          >

            <select
              value={resident}
              onChange={(event) =>
                setResident(
                  event.target.value
                )
              }
            >
              <option>
                Resident A
              </option>

              <option>
                Resident B
              </option>

              <option>
                Building Policy
              </option>

              <option>
                Judge Test
              </option>
            </select>

            <input
              value={condition}
              onChange={(event) =>
                setCondition(
                  event.target.value
                )
              }
              placeholder="temperature > 30"
            />

            <input
              value={action}
              onChange={(event) =>
                setAction(
                  event.target.value
                )
              }
              placeholder="fan = ON"
            />

            <input
              type="number"
              min="1"
              max="100"
              value={priority}
              onChange={(event) =>
                setPriority(
                  event.target.value
                )
              }
              placeholder="Priority"
            />

            <button
              type="submit"
              className="run-button"
            >
              + ADD RULE LIVE
            </button>

          </form>

        </Card>

        {/* RULE DISPLAY + LOG */}

        <div className="bottom-grid">

          <Card className="rule-list-card">

            <div className="section-header">

              <div>
                <h2>
                  Rule Display
                </h2>

                <p className="description">
                  All rules currently
                  registered.
                </p>
              </div>

              <span className="active-rule-label">
                {activeRules.length}{" "}
                ACTIVE
              </span>

            </div>

            <div className="rule-list">

              {rules.map((rule) => {

                const active =
                  evaluateCondition(
                    rule.condition,
                    environment
                  );

                const blocked =
                  cycleRuleIds.has(
                    rule.id
                  );

                return (
                  <div
                    className={`rule-row ${
                      active
                        ? "rule-active"
                        : ""
                    } ${
                      blocked
                        ? "rule-blocked"
                        : ""
                    }`}
                    key={rule.id}
                  >

                    <div>

                      <div className="rule-heading">

                        <strong>
                          {rule.id}
                        </strong>

                        <span>
                          {rule.resident}
                        </span>

                        {active && (
                          <em>
                            ACTIVE
                          </em>
                        )}

                        {blocked && (
                          <em className="blocked-label">
                            CYCLE
                          </em>
                        )}

                      </div>

                      <div className="rule-text">
                        <span>
                          IF
                        </span>{" "}
                        {rule.condition}
                      </div>

                      <div className="rule-text action-text">
                        <span>
                          THEN
                        </span>{" "}
                        {rule.action}
                      </div>

                    </div>

                    <div className="rule-priority">

                      <small>
                        PRIORITY
                      </small>

                      <strong>
                        {rule.priority}
                      </strong>

                    </div>

                  </div>
                );
              })}

            </div>

          </Card>

          <Card className="log-card">

            <h2>
              Decision Log
            </h2>

            <p className="description">
              Explainable execution
              history.
            </p>

            <div className="logs">

              {logs.map((log) => (
                <div
                  className="log"
                  key={log.id}
                >

                  <strong
                    className={`log-${log.type.toLowerCase()}`}
                  >
                    {log.type}
                  </strong>

                  <p>
                    {log.message}
                  </p>

                </div>
              ))}

            </div>

          </Card>

        </div>

      </main>
    </div>
  );
}