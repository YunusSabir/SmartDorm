import "./App.css";
import { useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
} from "@xyflow/react";
import {
  connectWebSocket,
  sendSensorUpdate,
  sendAddRule,
  sendRemoveRule,
  sendRunEngine,
} from "./services/websocket";

// This mirrors the backend's Environment state shape exactly (see
// simulator/Environment.js) so the UI never has to guess or rename
// fields. It's shown only until the first real message arrives.
const placeholderEnvironment = {
  temperature: 28,
  occupancy: 2,
  window: "CLOSED",
  time: 21,
  lights: "OFF",
  AC: "OFF",
  FAN: "OFF",
  BLINDS: "OPEN",
};

// The 5 rules the backend loads on startup (see backend/server.js).
// Used only to stop the user from deleting the demo baseline.
const BUILT_IN_RULE_COUNT = 6;

// Device metadata for the "Add Rule" form. This is UI plumbing only
// (which dropdown to show, what values are valid) - it contains no
// decision logic about when a rule should fire or who wins a conflict.
// That's the backend's job.
const CONDITION_VARIABLES = [
  "temperature",
  "occupancy",
  "time",
  "window",
  "lights",
  "AC",
  "FAN",
  "BLINDS",
];
const ACTION_DEVICES = ["window", "lights", "AC", "FAN", "BLINDS"];
const NUMERIC_VARIABLES = ["temperature", "occupancy", "time"];
const ENUM_VALUES = {
  window: ["OPEN", "CLOSED"],
  lights: ["ON", "OFF"],
  AC: ["ON", "OFF"],
  FAN: ["ON", "OFF"],
  BLINDS: ["OPEN", "CLOSED"],
};
const OPERATORS = [">", "<", "==", "!="];

function castConditionValue(variable, rawValue) {
  return NUMERIC_VARIABLES.includes(variable) ? Number(rawValue) : rawValue;
}

function getNextRuleId(rules) {
  const highest = Math.max(
    0,
    ...rules.map((rule) => Number(String(rule.id).replace(/^R/i, "")) || 0)
  );

  return `R${highest + 1}`;
}

function formatCondition(condition) {
  return `${condition.variable} ${condition.operator} ${condition.value}`;
}

function formatAction(action) {
  return `${action.device} = ${action.value}`;
}

function RuleNode({ data }) {
  return (
    <div className={`rule-node ${data.blocked ? "rule-node-cycle" : ""}`}>
      <Handle type="target" position={Position.Top} className="handle" />

      <div className="rule-node-header">
        <strong>{data.id}</strong>
        <span className="priority-badge">P{data.priority}</span>
      </div>

      <div className="rule-resident">{data.resident}</div>

      <div className="rule-condition">IF {formatCondition(data.condition)}</div>

      <div className="rule-action">THEN {formatAction(data.action)}</div>

      {data.blocked && (
        <div className="cycle-node-warning">⚠ CYCLE MEMBER</div>
      )}

      <Handle type="source" position={Position.Bottom} className="handle" />
    </div>
  );
}

const nodeTypes = { rule: RuleNode };

function Card({ children, className = "" }) {
  return <section className={`card ${className}`}>{children}</section>;
}

function StateBadge({ value }) {
  const active = value === "ON" || value === "OPEN";

  return (
    <span className={`state-badge ${active ? "state-active" : "state-inactive"}`}>
      {value}
    </span>
  );
}

function DeviceCard({ icon, name, value, onClick }) {
  return (
    <button type="button" className="device-card" onClick={onClick}>
      <span className="device-icon">{icon}</span>
      <span className="device-name">{name}</span>
      <StateBadge value={value} />
    </button>
  );
}

export default function App() {
  const [environment, setEnvironment] = useState(placeholderEnvironment);
  const [rules, setRules] = useState([]);
  const [edges, setEdges] = useState([]);
  const [cycle, setCycle] = useState({ detected: false, path: null });
  const [activeRuleIds, setActiveRuleIds] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [logs, setLogs] = useState([
    { id: "boot", type: "SYSTEM", message: "Connecting to backend..." },
  ]);
  const [wsStatus, setWsStatus] = useState("CONNECTING");

  // Add-rule form fields
  const [resident, setResident] = useState("Resident A");
  const [conditionVariable, setConditionVariable] = useState("temperature");
  const [conditionOperator, setConditionOperator] = useState(">");
  const [conditionValue, setConditionValue] = useState("30");
  const [actionDevice, setActionDevice] = useState("FAN");
  const [actionValue, setActionValue] = useState("ON");
  const [priority, setPriority] = useState(5);

  useEffect(() => {
    connectWebSocket({
      onOpen: () => setWsStatus("CONNECTED"),
      onClose: () => setWsStatus("DISCONNECTED"),
      onError: () => setWsStatus("ERROR"),
      onMessage: (message) => {
        if (message.type === "error") {
          setLogs((previous) => [
            { id: Date.now() + Math.random(), type: "ERROR", message: message.message },
            ...previous,
          ]);
          return;
        }

        if (message.type !== "state") {
          return;
        }

        const data = message.data;

        // Everything below is the backend's own conclusion. The
        // frontend does not evaluate conditions, build the graph,
        // resolve conflicts, or detect cycles - it just displays
        // what the engine already decided.
        setEnvironment(data.environment);
        setRules(data.rules);
        setEdges(data.edges);
        setCycle(data.cycle);
        setActiveRuleIds(data.activeRuleIds);
        setConflicts(data.conflicts);

        if (data.logs && data.logs.length > 0) {
          setLogs((previous) => [
            ...data.logs.map((log) => ({
              id: Date.now() + Math.random(),
              type: log.type,
              message: log.message,
            })),
            ...previous,
          ]);
        }
      },
    });
  }, []);

  const cycleRuleIds = useMemo(
    () => new Set(cycle.path || []),
    [cycle]
  );

  const activeRuleIdSet = useMemo(
    () => new Set(activeRuleIds),
    [activeRuleIds]
  );

  const nodes = useMemo(
    () =>
      rules.map((rule, index) => ({
        id: rule.id,
        type: "rule",
        position: { x: (index % 3) * 310, y: Math.floor(index / 3) * 250 },
        data: { ...rule, blocked: cycleRuleIds.has(rule.id) },
      })),
    [rules, cycleRuleIds]
  );

  const lastExecutionSummary = cycle.detected
    ? {
        success: false,
        message: `Execution blocked: circular dependency ${cycle.path.join(" \u2192 ")}`,
      }
    : activeRuleIds.length > 0
    ? { success: true, message: `${activeRuleIds.length} rule(s) fired.` }
    : null;

  function changeTemperature(amount) {
    const next = Math.max(10, Math.min(45, environment.temperature + amount));
    sendSensorUpdate("temperature", next);
  }

  function changeOccupancy(amount) {
    const next = Math.max(0, Math.min(10, environment.occupancy + amount));
    sendSensorUpdate("occupancy", next);
  }

  function changeTime(nextValue) {
    const next = Math.max(0, Math.min(23, Number(nextValue)));
    sendSensorUpdate("time", next);
  }

  function toggleDevice(device, onValue, offValue) {
    const next = environment[device] === onValue ? offValue : onValue;
    sendSensorUpdate(device, next);
  }

  function handleAddRule(event) {
    event.preventDefault();

    if (conditionValue === "") {
      return;
    }

    sendAddRule({
      id: getNextRuleId(rules),
      resident,
      condition: {
        variable: conditionVariable,
        operator: conditionOperator,
        value: castConditionValue(conditionVariable, conditionValue),
      },
      action: {
        device: actionDevice,
        value: actionValue,
      },
      priority: Number(priority) || 1,
    });

    setPriority(5);
  }

  function injectCycleRule() {
    // Adds a real rule that closes the loop already present in the
    // demo ruleset: R3 (window -> FAN) -> R4 (FAN -> BLINDS) -> this
    // rule (BLINDS -> window). The backend's own DependencyGraph +
    // CycleDetector catch it - nothing is faked on the frontend.
    sendAddRule({
      id: getNextRuleId(rules),
      resident: "Judge Test",
      condition: { variable: "BLINDS", operator: "==", value: "CLOSED" },
      action: { device: "window", value: "OPEN" },
      priority: 6,
    });
  }

  function removeLastRule() {
    if (rules.length <= BUILT_IN_RULE_COUNT) {
      setLogs((previous) => [
        {
          id: Date.now() + Math.random(),
          type: "SYSTEM",
          message: "The built-in demonstration rules cannot be removed.",
        },
        ...previous,
      ]);
      return;
    }

    const lastRule = rules[rules.length - 1];
    sendRemoveRule(lastRule.id);
  }

  const conditionValueOptions = ENUM_VALUES[conditionVariable];
  const actionValueOptions = ENUM_VALUES[actionDevice] || ["ON", "OFF"];

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div>
            <h1>SmartDorm</h1>
            <p>Fairness-Aware Multi-Resident Rule Engine</p>
          </div>

          <div className="simulation-badge">SIMULATION MODE</div>
          <div className="simulation-badge">WS: {wsStatus}</div>
        </div>
      </header>

      <main className="main">
        {/* TOP DASHBOARD */}
        <div className="top-grid">
          <Card>
            <div className="metric-label">👥 OCCUPANCY</div>
            <div className="metric-controls">
              <button type="button" className="round-button" onClick={() => changeOccupancy(-1)}>
                −
              </button>
              <strong>{environment.occupancy}</strong>
              <button type="button" className="round-button" onClick={() => changeOccupancy(1)}>
                +
              </button>
            </div>
            <div className="metric-subtitle">Residents inside</div>
          </Card>

          <Card>
            <div className="metric-label">🌡️ TEMPERATURE</div>
            <div className="metric-controls">
              <button type="button" className="round-button" onClick={() => changeTemperature(-1)}>
                −
              </button>
              <strong>{environment.temperature}°C</strong>
              <button type="button" className="round-button" onClick={() => changeTemperature(1)}>
                +
              </button>
            </div>
            <div className="metric-subtitle">Simulated temperature</div>
          </Card>

          <Card>
            <div className="metric-label">ACTIVE RULES</div>
            <strong className="rule-count">{activeRuleIds.length}</strong>
            <div className="metric-subtitle">Fired on the last update</div>
          </Card>
        </div>

        {/* ENVIRONMENT + GRAPH */}
        <div className="environment-graph">
          <div className="left-column">
            <Card>
              <h2>Simulated Environment</h2>
              <p className="description">Change the environment without physical sensors.</p>

              <div className="control-group">
                <label>TIME (0-23h)</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={environment.time}
                  onChange={(event) => changeTime(event.target.value)}
                />
              </div>

              <div className="control-group">
                <label>🌡️ TEMPERATURE</label>
                <div className="inline-control">
                  <button type="button" className="small-button" onClick={() => changeTemperature(-1)}>
                    −
                  </button>
                  <strong>{environment.temperature}°C</strong>
                  <button type="button" className="small-button" onClick={() => changeTemperature(1)}>
                    +
                  </button>
                </div>
              </div>

              <div className="control-group">
                <label>👥 OCCUPANCY</label>
                <div className="inline-control">
                  <button type="button" className="small-button" onClick={() => changeOccupancy(-1)}>
                    −
                  </button>
                  <strong>{environment.occupancy}</strong>
                  <button type="button" className="small-button" onClick={() => changeOccupancy(1)}>
                    +
                  </button>
                </div>
              </div>

              <button
                type="button"
                className="window-control"
                onClick={() => toggleDevice("window", "OPEN", "CLOSED")}
              >
                <span>🪟 WINDOW</span>
                <StateBadge value={environment.window} />
              </button>

              <button type="button" className="run-button" onClick={sendRunEngine}>
                ▶ RE-RUN RULE ENGINE
              </button>

              {lastExecutionSummary && (
                <div
                  className={`execution-result ${
                    lastExecutionSummary.success ? "execution-success" : "execution-error"
                  }`}
                >
                  {lastExecutionSummary.message}
                </div>
              )}
            </Card>

            <Card>
              <h2>Device State</h2>
              <p className="description">Click a device to change its state.</p>

              <div className="device-grid">
                <DeviceCard
                  icon="💡"
                  name="LIGHTS"
                  value={environment.lights}
                  onClick={() => toggleDevice("lights", "ON", "OFF")}
                />
                <DeviceCard
                  icon="❄️"
                  name="AC"
                  value={environment.AC}
                  onClick={() => toggleDevice("AC", "ON", "OFF")}
                />
                <DeviceCard
                  icon="🌀"
                  name="FAN"
                  value={environment.FAN}
                  onClick={() => toggleDevice("FAN", "ON", "OFF")}
                />
                <DeviceCard
                  icon="🪟"
                  name="WINDOW"
                  value={environment.window}
                  onClick={() => toggleDevice("window", "OPEN", "CLOSED")}
                />
                <DeviceCard
                  icon="🪟"
                  name="BLINDS"
                  value={environment.BLINDS}
                  onClick={() => toggleDevice("BLINDS", "CLOSED", "OPEN")}
                />
              </div>
            </Card>
          </div>

          {/* DEPENDENCY GRAPH */}
          <Card className="graph-card">
            <div className="section-header">
              <div>
                <h2>Dependency Graph</h2>
                <p className="description">
                  Rules are connected when one rule's action affects another rule's condition.
                  Computed by the backend's DependencyGraph, not the browser.
                </p>
              </div>
              <span className={`graph-status ${cycle.detected ? "danger" : "safe"}`}>
                {cycle.detected ? "⚠ CYCLE DETECTED" : "✓ GRAPH SAFE"}
              </span>
            </div>

            <div className="graph">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                proOptions={{ hideAttribution: true }}
              >
                <Background gap={24} color="#20344b" />
                <Controls />
                <MiniMap />
              </ReactFlow>
            </div>
          </Card>
        </div>

        {/* CONFLICT + CYCLE */}
        <div className="two-column">
          <Card>
            <div className="section-header">
              <div>
                <h2>Conflict Arbitration</h2>
                <p className="description">
                  Contradictory active rules are resolved by the backend's ConflictResolver
                  using priority plus a fairness bonus for previously-overridden residents.
                </p>
              </div>
              <span className="conflict-count">
                {conflicts.length} CONFLICT{conflicts.length === 1 ? "" : "S"}
              </span>
            </div>

            {conflicts.length === 0 ? (
              <div className="empty-state">
                No active contradictory rules.
                <br />
                Change the environment or add a conflicting rule to test arbitration.
              </div>
            ) : (
              <div className="conflict-list">
                {conflicts.map((conflict, index) => (
                  <div className="conflict" key={`${conflict.winner.ruleId}-${conflict.loser.ruleId}-${index}`}>
                    <div className="conflict-title">
                      CONTRADICTION ON {conflict.device.toUpperCase()}
                    </div>

                    <div className="conflict-rules">
                      <div className="conflict-rule winner">
                        <div className="rule-top">
                          <strong>{conflict.winner.ruleId}</strong>
                          <span>WINNER</span>
                        </div>
                        <div>{conflict.winner.action}</div>
                        <small>
                          Base {conflict.winner.basePriority}
                          {conflict.winner.fairnessAdjustment > 0 &&
                            ` + fairness ${conflict.winner.fairnessAdjustment}`}{" "}
                          = {conflict.winner.effectivePriority}
                        </small>
                      </div>

                      <div className="conflict-rule">
                        <div className="rule-top">
                          <strong>{conflict.loser.ruleId}</strong>
                        </div>
                        <div>{conflict.loser.action}</div>
                        <small>
                          Base {conflict.loser.basePriority}
                          {conflict.loser.fairnessAdjustment > 0 &&
                            ` + fairness ${conflict.loser.fairnessAdjustment}`}{" "}
                          = {conflict.loser.effectivePriority}
                        </small>
                      </div>
                    </div>

                    <div className="winner-explanation">
                      <strong>🏆 {conflict.winner.ruleId} WINS</strong>
                      <p>{conflict.winner.action}</p>
                      <span>Why: {conflict.reason}.</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* CYCLE DETECTION */}
          <Card>
            <div className="section-header">
              <div>
                <h2>Cycle Detection</h2>
                <p className="description">
                  The backend's CycleDetector runs a DFS with a recursion stack against the
                  live graph on every update.
                </p>
              </div>
              <span className={`graph-status ${cycle.detected ? "danger" : "safe"}`}>
                {cycle.detected ? "BLOCKED" : "SAFE"}
              </span>
            </div>

            {cycle.detected ? (
              <div className="cycle-warning">
                <strong>⚠ Circular dependency detected</strong>
                <div className="cycle-path">{cycle.path.join(" → ")}</div>
                <p>
                  The backend refuses to execute the rule graph while a cycle exists, so it
                  can never enter an infinite loop.
                </p>
                <button type="button" className="secondary-button" onClick={removeLastRule}>
                  REMOVE TEST RULE
                </button>
              </div>
            ) : (
              <>
                <div className="safe-box">
                  <strong>✓ No circular dependency</strong>
                  <p>The current graph contains no cycle.</p>
                </div>

                <button type="button" className="danger-button" onClick={injectCycleRule}>
                  ⚠ INJECT REAL CYCLE TEST
                </button>

                <div className="test-info">
                  <strong>Cycle demonstration</strong>
                  <p>The button adds a real rule via the backend:</p>
                  <code>
                    IF BLINDS == CLOSED
                    <br />
                    THEN window = OPEN
                  </code>
                  <p>Combined with the existing chain:</p>
                  <code>
                    R3: window==OPEN → FAN=ON
                    <br />
                    R4: FAN==ON → BLINDS=CLOSED
                  </code>
                  <p>The dependency graph becomes:</p>
                  <code className="danger-text">R3 → R4 → (new rule) → R3</code>
                </div>
              </>
            )}
          </Card>
        </div>

        {/* ADD RULE */}
        <Card>
          <h2>Add Rule Live</h2>
          <p className="description">
            Add a rule while the system is running. It's sent straight to the backend, which
            rebuilds the dependency graph, re-checks for cycles, and re-evaluates - the graph,
            conflicts, and cycle status you see update from its response.
          </p>

          <form className="rule-form" onSubmit={handleAddRule}>
            <select value={resident} onChange={(event) => setResident(event.target.value)}>
              <option>Resident A</option>
              <option>Resident B</option>
              <option>Building Policy</option>
              <option>Judge Test</option>
            </select>

            <select
              value={conditionVariable}
              onChange={(event) => {
                const nextVariable = event.target.value;
                setConditionVariable(nextVariable);
                setConditionValue(
                  NUMERIC_VARIABLES.includes(nextVariable)
                    ? "30"
                    : ENUM_VALUES[nextVariable]?.[0] || "ON"
                );
              }}
            >
              {CONDITION_VARIABLES.map((variable) => (
                <option key={variable} value={variable}>
                  IF {variable}
                </option>
              ))}
            </select>

            <select value={conditionOperator} onChange={(event) => setConditionOperator(event.target.value)}>
              {OPERATORS.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>

            {NUMERIC_VARIABLES.includes(conditionVariable) ? (
              <input
                type="number"
                value={conditionValue}
                onChange={(event) => setConditionValue(event.target.value)}
              />
            ) : (
              <select value={conditionValue} onChange={(event) => setConditionValue(event.target.value)}>
                {(conditionValueOptions || ["ON", "OFF"]).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            )}

            <select
              value={actionDevice}
              onChange={(event) => {
                const nextDevice = event.target.value;
                setActionDevice(nextDevice);
                setActionValue(ENUM_VALUES[nextDevice]?.[0] || "ON");
              }}
            >
              {ACTION_DEVICES.map((device) => (
                <option key={device} value={device}>
                  THEN {device}
                </option>
              ))}
            </select>

            <select value={actionValue} onChange={(event) => setActionValue(event.target.value)}>
              {actionValueOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>

            <input
              type="number"
              min="1"
              max="100"
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              placeholder="Priority"
            />

            <button type="submit" className="run-button">
              + ADD RULE LIVE
            </button>
          </form>
        </Card>

        {/* RULE DISPLAY + LOG */}
        <div className="bottom-grid">
          <Card className="rule-list-card">
            <div className="section-header">
              <div>
                <h2>Rule Display</h2>
                <p className="description">All rules currently registered on the backend.</p>
              </div>
              <span className="active-rule-label">{activeRuleIds.length} ACTIVE</span>
            </div>

            <div className="rule-list">
              {rules.map((rule) => {
                const active = activeRuleIdSet.has(rule.id);
                const blocked = cycleRuleIds.has(rule.id);

                return (
                  <div
                    className={`rule-row ${active ? "rule-active" : ""} ${blocked ? "rule-blocked" : ""}`}
                    key={rule.id}
                  >
                    <div>
                      <div className="rule-heading">
                        <strong>{rule.id}</strong>
                        <span>{rule.resident}</span>
                        {active && <em>ACTIVE</em>}
                        {blocked && <em className="blocked-label">CYCLE</em>}
                      </div>

                      <div className="rule-text">
                        <span>IF</span> {formatCondition(rule.condition)}
                      </div>

                      <div className="rule-text action-text">
                        <span>THEN</span> {formatAction(rule.action)}
                      </div>
                    </div>

                    <div className="rule-priority">
                      <small>PRIORITY</small>
                      <strong>{rule.priority}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="log-card">
            <h2>Decision Log</h2>
            <p className="description">
              Every entry here is generated by the backend engine, not the browser.
            </p>

            <div className="logs">
              {logs.map((log) => (
                <div className="log" key={log.id}>
                  <strong className={`log-${log.type.toLowerCase()}`}>{log.type}</strong>
                  <p>{log.message}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}