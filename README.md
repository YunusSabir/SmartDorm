# SmartDorm — Multi-Resident Rule Engine

A fairness-aware and explainable IoT rule engine designed for shared smart spaces.

## Overview

SmartDorm is a real-time rule engine for shared environments where multiple residents can create automation rules that may conflict with one another.

For example, one resident may want the lights ON while a building energy-saving policy requires them to be OFF.

SmartDorm resolves these competing rules using a graph-based rule engine with priority arbitration and adaptive fairness.

## Key Features

- Multi-resident rule management
- Rule chaining
- Dependency graph-based execution
- Priority-based conflict arbitration
- Adaptive/fairness-aware priority
- Explainable conflict resolution
- Circular dependency detection
- Live rule creation
- Real-time IoT event processing
- Simulated smart dorm environment

## Example

### Rule Chaining

```text
Window Open
     then
AC OFF
     then
Temperature > 28°C
     then
Fan ON

