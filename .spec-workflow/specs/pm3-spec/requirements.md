# Requirements Document

## Introduction

pm3 is a lightweight, local-first process manager inspired by PM2. Unlike PM2's daemon-based architecture, pm3 operates in a local mode driven by a `.pm3.json` configuration file. It discovers the config by searching from the current working directory upward through parent directories to the root, making it project-scoped by convention. pm3 supports starting, stopping, restarting, and listing application processes defined in the config.

## Requirements

### Requirement 1: Configuration Discovery

**User Story:** As a developer, I want pm3 to automatically find my `.pm3.json` config file by searching from the current directory upward, so that I can run pm3 commands from anywhere within my project tree.

#### Acceptance Criteria

1. WHEN pm3 is invoked THEN the system SHALL search for `.pm3.json` starting in the current working directory
2. IF `.pm3.json` is not found in the current directory THEN the system SHALL search each parent directory up to the filesystem root
3. WHEN `.pm3.json` is found THEN the system SHALL use it as the active configuration
4. IF no `.pm3.json` is found in any ancestor directory THEN the system SHALL display an error message and exit with a non-zero code
5. WHEN `.pm3.json` is found THEN the `cwd` field in each app SHALL be resolved relative to the directory containing the config file
6. WHEN `.pm3.json` is found THEN all other path fields (e.g., `script`) SHALL be resolved relative to the app's resolved `cwd`

### Requirement 2: Configuration Format

**User Story:** As a developer, I want to define my applications in a simple JSON format, so that I can easily manage multiple processes from a single config file.

#### Acceptance Criteria

1. The config file SHALL support an `apps` array containing application definitions
2. Each app definition SHALL support the following fields:
   - `name` (string, required): unique identifier for the process
   - `script` (string, required): path to the script to execute
   - `cwd` (string, optional): working directory for the process
   - `args` (string, optional): command-line arguments to pass to the script
3. IF a required field is missing THEN the system SHALL display a validation error and skip that app
4. IF duplicate `name` values exist THEN the system SHALL display a warning and use the first occurrence

### Requirement 3: Start Command

**User Story:** As a developer, I want to start all or specific applications defined in my config, so that I can bring up my local services quickly.

#### Acceptance Criteria

1. WHEN `pm3 start` is invoked without arguments THEN the system SHALL start all apps defined in the config
2. WHEN `pm3 start <name>` is invoked THEN the system SHALL start only the app matching `<name>`
3. IF the named app is not found in config THEN the system SHALL display an error message
4. WHEN starting an app THEN the system SHALL spawn the process in the background using the configured `script`, `cwd`, and `args`
5. WHEN an app is started THEN the system SHALL store the process PID for tracking
6. IF an app is already running THEN the system SHALL display a message indicating it is already running and take no action

### Requirement 4: Stop Command

**User Story:** As a developer, I want to stop all or specific running applications, so that I can cleanly shut down services.

#### Acceptance Criteria

1. WHEN `pm3 stop` is invoked without arguments THEN the system SHALL stop all currently running apps
2. WHEN `pm3 stop <name>` is invoked THEN the system SHALL stop only the app matching `<name>`
3. IF the named app is not found or not running THEN the system SHALL display an appropriate message
4. WHEN stopping an app THEN the system SHALL send SIGTERM to the process
5. IF the process does not exit within a reasonable timeout (e.g., 5 seconds) THEN the system SHALL send SIGKILL
6. WHEN an app is stopped THEN the system SHALL update the stored process state

### Requirement 5: Restart Command

**User Story:** As a developer, I want to restart all or specific applications, so that I can apply changes without manually stopping and starting.

#### Acceptance Criteria

1. WHEN `pm3 restart` is invoked without arguments THEN the system SHALL restart all apps defined in the config
2. WHEN `pm3 restart <name>` is invoked THEN the system SHALL restart only the app matching `<name>`
3. WHEN restarting THEN the system SHALL stop the running process (if any) and then start it again
4. IF the app is not currently running THEN restart SHALL simply start it

### Requirement 6: List Command

**User Story:** As a developer, I want to see the status of all configured applications, so that I can quickly understand which processes are running, stopped, or errored.

#### Acceptance Criteria

1. WHEN `pm3 list` is invoked THEN the system SHALL display a table of all apps defined in the config
2. The table SHALL include columns for: name, status (running/stopped), PID (if running), and uptime (if running)
3. WHEN displaying status THEN the system SHALL validate PIDs against actually running OS processes to ensure accuracy

### Requirement 7: Process State Tracking

**User Story:** As a developer, I want pm3 to track which processes are running, so that commands work reliably across invocations.

#### Acceptance Criteria

1. The system SHALL maintain a state file (e.g., `.pm3.state.json`) alongside the config file to track running process PIDs and status
2. WHEN any command is invoked THEN the system SHALL validate stored PIDs against actually running OS processes
3. IF a stored PID no longer corresponds to a running process THEN the system SHALL mark that app as stopped

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: Separate config discovery, config parsing, process management, and CLI handling into distinct modules
- **Modular Design**: Each module should be independently testable
- **Clear Interfaces**: Define clean contracts between the CLI layer, config layer, and process manager

### Performance
- Process startup should be near-instantaneous; config discovery should complete in under 100ms
- State file reads/writes should be atomic to prevent corruption

### Reliability
- Stale PID detection must be robust — never attempt to kill a PID belonging to a different process
- Graceful degradation if state file is corrupted (recreate it)

### Usability
- Clear, colored console output indicating process status
- Meaningful error messages when config is invalid or processes fail to start
- Simple CLI interface: `pm3 <command> [name]`
