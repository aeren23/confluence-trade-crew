---
trigger: always_on
---

# Coding & Development Rules for AI Agents (Antigravity/Cursor/Claude)

You must read, understand, and strictly follow the project standards defined in the `docs/rules/` directory before performing any task. Do not duplicate these rules in other files; refer to the official files directly.

## Rules & Standards Files

1. **Coding Standards & Architecture Guidelines**:
   * Refer to [coding_standarts.md](file:///c:/Users/alihe/OneDrive/Masa%C3%BCst%C3%BC/confluence-trade-crew/docs/rules/coding_standarts.md) for Clean Code practices, SOLID principles, naming conventions, and file write protocols.
   
2. **Global Logging Protocol**:
   * Refer to [logging_standarts.md](file:///c:/Users/alihe/OneDrive/Masa%C3%BCst%C3%BC/confluence-trade-crew/docs/rules/logging_standarts.md) for how and when to append entries to [project_log.md](file:///c:/Users/alihe/OneDrive/Masa%C3%BCst%C3%BC/confluence-trade-crew/docs/project_log.md).

3. **State Control Standards**:
   * Refer to [state_control_standarts.md](file:///c:/Users/alihe/OneDrive/Masa%C3%BCst%C3%BC/confluence-trade-crew/docs/rules/state_control_standarts.md) for the execution workflow, task validation, and how to keep [state.md](file:///c:/Users/alihe/OneDrive/Masa%C3%BCst%C3%BC/confluence-trade-crew/docs/state.md) updated.

## Mandatory Execution Workflow

1. **Read State First**: Always read [state.md](file:///c:/Users/alihe/OneDrive/Masa%C3%BCst%C3%BC/confluence-trade-crew/docs/state.md) at the start of any execution to understand the current phase, completed roadmap items, active tasks, and solved problems.
2. **Verify Implementation**: Assess all proposed code changes against the SOLID principles and clean coding conventions in `coding_standarts.md`.
3. **Update State File**: Modify [state.md](file:///c:/Users/alihe/OneDrive/Masa%C3%BCst%C3%BC/confluence-trade-crew/docs/state.md) at the end of your execution to reflect newly completed tasks, update progress percentages, and log any newly solved problems.
4. **Log Action**: Append a new entry to [project_log.md](file:///c:/Users/alihe/OneDrive/Masa%C3%BCst%C3%BC/confluence-trade-crew/docs/project_log.md) at the end of execution using the mandatory template.
