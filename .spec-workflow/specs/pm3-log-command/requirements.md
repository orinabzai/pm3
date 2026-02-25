# Requirements Document

## Introduction

Add a `log` feature to pm3 that captures application stdout/stderr into log files and provides a `pm3 log` command to tail those files live. Each app can optionally define a `log` file path in `.pm3.json`. When `pm3 start` launches the app, stdout and stderr are redirected to that log file. The `pm3 log` command then tails the log file to the terminal in real-time.

## Requirements

### Requirement 1: Log File Configuration

**User Story:** As a developer, I want to configure a log file path per app in `.pm3.json`, so that pm3 knows where to write and read logs for each service.

#### Acceptance Criteria

1. Each app definition in `.pm3.json` SHALL support an optional `log` field (string) specifying a file path
2. The `log` field SHALL be resolved relative to the app's resolved `cwd` (same convention as `script`)
3. IF an app does not have a `log` field THEN stdout/stderr SHALL remain ignored (current behavior) and `pm3 log` SHALL skip that app

### Requirement 2: Stdout/Stderr Redirection on Start

**User Story:** As a developer, I want my app's stdout and stderr captured to a log file when started via pm3, so that I can review output later or tail it live.

#### Acceptance Criteria

1. WHEN `pm3 start` launches an app that has a `log` field configured THEN the system SHALL redirect the spawned process's stdout and stderr to the configured log file
2. The log file SHALL be opened in append mode so that restarts do not overwrite previous output
3. IF the log file's parent directory does not exist THEN the system SHALL create it recursively before starting the process
4. IF the app has no `log` field THEN the system SHALL use `stdio: 'ignore'` (current behavior)

### Requirement 3: Log Command — Single App

**User Story:** As a developer, I want to run `pm3 log <name>` to see live log output from a specific app, so that I can monitor a single service.

#### Acceptance Criteria

1. WHEN `pm3 log <name>` is invoked THEN the system SHALL tail the app's configured log file and stream new lines to the terminal in real-time
2. The command SHALL display existing file content (last portion) then continue following new output
3. The log command SHALL remain running (live/streaming) until the user presses Ctrl+C
4. WHEN the user presses Ctrl+C THEN the system SHALL stop watching and exit cleanly
5. IF the named app has no `log` field configured THEN the system SHALL display an error and exit
6. IF the log file does not exist yet THEN the system SHALL wait for it to appear and then start tailing

### Requirement 4: Log Command — All Apps

**User Story:** As a developer, I want to run `pm3 log` without arguments to see live log output from all apps, so that I can monitor all services at once.

#### Acceptance Criteria

1. WHEN `pm3 log` is invoked without arguments THEN the system SHALL tail log files for all apps that have a `log` field configured
2. Each line of output SHALL be prefixed with the app name (e.g., `[executor-api] log line here`)
3. Output from all apps SHALL be interleaved in real-time
4. WHEN the user presses Ctrl+C THEN the system SHALL stop all watchers and exit cleanly
5. IF no apps have a `log` field configured THEN the system SHALL display an error and exit

## Non-Functional Requirements

### Usability
- App name prefixes should be visually distinct (bracketed)
- Clean shutdown on Ctrl+C with no orphaned watchers
