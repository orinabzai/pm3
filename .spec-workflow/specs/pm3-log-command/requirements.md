# Requirements Document

## Introduction

Add a `log` command to pm3 that displays live log output from configured applications. Each app can optionally define a `log` script in `.pm3.json` that produces log output to stdout. The `pm3 log` command spawns these log scripts and streams their output to the terminal in real-time, prefixed by app name for multiplexed viewing.

## Requirements

### Requirement 1: Log Script Configuration

**User Story:** As a developer, I want to configure a log script per app in `.pm3.json`, so that pm3 knows how to retrieve live logs for each service.

#### Acceptance Criteria

1. Each app definition in `.pm3.json` SHALL support an optional `log` field (string)
2. The `log` field SHALL be resolved relative to the app's resolved `cwd` (same convention as `script`)
3. IF an app does not have a `log` field THEN the system SHALL skip that app when displaying logs and print a warning

### Requirement 2: Log Command — Single App

**User Story:** As a developer, I want to run `pm3 log <name>` to see live log output from a specific app, so that I can monitor a single service.

#### Acceptance Criteria

1. WHEN `pm3 log <name>` is invoked THEN the system SHALL spawn the app's log script in its configured `cwd`
2. The spawned log script's stdout and stderr SHALL be piped directly to the terminal in real-time
3. The log command SHALL remain running (live/streaming) until the user presses Ctrl+C
4. WHEN the user presses Ctrl+C THEN the system SHALL terminate the log script process and exit cleanly
5. IF the named app has no `log` field configured THEN the system SHALL display an error and exit

### Requirement 3: Log Command — All Apps

**User Story:** As a developer, I want to run `pm3 log` without arguments to see live log output from all apps, so that I can monitor all services at once.

#### Acceptance Criteria

1. WHEN `pm3 log` is invoked without arguments THEN the system SHALL spawn log scripts for all apps that have a `log` field configured
2. Each line of output SHALL be prefixed with the app name (e.g., `[executor-api] log line here`) to distinguish between apps
3. All log scripts SHALL run concurrently, with output interleaved in real-time
4. WHEN the user presses Ctrl+C THEN the system SHALL terminate all spawned log script processes and exit cleanly
5. IF no apps have a `log` field configured THEN the system SHALL display an error and exit

## Non-Functional Requirements

### Usability
- App name prefixes should be visually distinct (e.g., colored or bracketed)
- Clean shutdown on Ctrl+C with no orphaned processes
