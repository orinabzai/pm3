# Tasks Document

- [ ] 1. Add `log` field to config interfaces and resolution
  - File: `src/config.ts`
  - Add optional `log?: string` to `AppConfig` interface
  - Add optional `log?: string` to `ResolvedAppConfig` interface
  - In `discoverConfig()`, resolve `log` relative to the app's resolved `cwd` (same as `script`)
  - Purpose: Enable apps to declare a log script in `.pm3.json`
  - _Leverage: Existing path resolution pattern in src/config.ts (line 71, resolvedScript)_
  - _Requirements: 1_
  - _Prompt: Implement the task for spec pm3-log-command, first run spec-workflow-guide to get the workflow guide then implement the task: Role: TypeScript Developer | Task: Add optional `log?: string` field to both `AppConfig` and `ResolvedAppConfig` interfaces in src/config.ts. In the discoverConfig function, resolve the `log` field relative to the app's resolved `cwd`, following the exact same pattern used for `script` resolution on line 71. Only resolve if the field is present. | Restrictions: Do not change any existing field behavior. Do not make `log` required. Keep the field undefined if not provided in config. | _Leverage: src/config.ts existing path resolution pattern for `script` | Success: AppConfig and ResolvedAppConfig have optional `log` field. When `.pm3.json` includes a `log` field, it is resolved to an absolute path relative to cwd. When omitted, the field is undefined. Project compiles. | Instructions: Mark this task as [-] in tasks.md before starting. After completion, log implementation with log-implementation tool, then mark as [x] in tasks.md._

- [ ] 2. Implement `logApps` function in manager
  - File: `src/manager.ts`
  - Add `logApps(apps: ResolvedAppConfig[], name?: string): Promise<void>`
  - If `name` provided, filter to that app; validate it has a `log` field
  - If no `name`, filter to apps with `log` field; error if none
  - Single app: spawn log script with `stdio: ['ignore', 'inherit', 'inherit']` (direct passthrough)
  - Multiple apps: spawn each with `stdio: ['ignore', 'pipe', 'pipe']`, use readline on stdout/stderr, prefix each line with `[app-name]`
  - Register SIGINT handler to kill all children on Ctrl+C
  - Return Promise that resolves when all children exit or SIGINT fires
  - Purpose: Core log streaming logic
  - _Leverage: src/manager.ts existing spawn patterns (startApp), Node.js child_process, readline_
  - _Requirements: 2, 3_
  - _Prompt: Implement the task for spec pm3-log-command, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Node.js Developer specializing in child process streaming | Task: Add `logApps(apps: ResolvedAppConfig[], name?: string): Promise<void>` to src/manager.ts. If name is given, find the matching app and verify it has a `log` field (error + process.exit(1) if not). If no name, filter to apps that have `log` defined (error + process.exit(1) if none). For single app: spawn the log script using `spawn(log_script, [], { cwd, stdio: ['ignore', 'inherit', 'inherit'] })`. For multiple apps: spawn each with piped stdio, use node:readline createInterface on each child's stdout and stderr, prefix every line with `[appName]` via console.log. Track all spawned ChildProcess instances. Register a process 'SIGINT' handler that kills all children and calls process.exit(0). Return a Promise that resolves when all children have exited. The log script should be spawned directly (not via `node`) since it could be a shell script. | Restrictions: Do not modify existing functions. Do not use external dependencies. Import readline from node:readline. Keep consistent with existing code style. | _Leverage: src/manager.ts existing spawn pattern, src/config.ts ResolvedAppConfig type | Success: Single app streams log output directly to terminal. Multiple apps show prefixed interleaved output. Ctrl+C cleanly kills all log processes. Errors shown for missing log field. | Instructions: Mark this task as [-] in tasks.md before starting. After completion, log implementation with log-implementation tool, then mark as [x] in tasks.md._

- [ ] 3. Add `commandLog` handler and yargs command to CLI
  - File: `src/cli.ts`
  - Add `commandLog(name?: string): Promise<void>` following existing handler convention
  - Handler calls `discoverConfig()` then `logApps(config.apps, name)`
  - Add yargs `.command('log [name]', 'Show live log output', ...)` delegating to `commandLog`
  - Import `logApps` from manager
  - Purpose: Wire log command into the CLI
  - _Leverage: src/cli.ts existing commandName pattern, findApp helper_
  - _Requirements: 2, 3_
  - _Prompt: Implement the task for spec pm3-log-command, first run spec-workflow-guide to get the workflow guide then implement the task: Role: CLI Developer | Task: Add `commandLog(name?: string): Promise<void>` to src/cli.ts following the existing command handler convention. The handler should call `discoverConfig()` and then `logApps(config.apps, name)`, wrapped in try/catch with console.error + process.exit(1). Add a yargs command `'log [name]'` with description `'Show live log output'` that delegates to `commandLog(argv.name)`. Import `logApps` from `./manager.js`. | Restrictions: Follow the exact same pattern as commandStart/commandStop/commandRestart. Do not add state loading — log command does not need state. Keep command definition thin. | _Leverage: src/cli.ts existing commandStart pattern, src/manager.ts logApps | Success: pm3 log shows in --help. pm3 log streams all apps logs. pm3 log myapp streams one app log. Errors handled cleanly. | Instructions: Mark this task as [-] in tasks.md before starting. After completion, log implementation with log-implementation tool, then mark as [x] in tasks.md._

- [ ] 4. Build and end-to-end validation
  - Files: No new files
  - Run `npm run build` to compile
  - Create test `.pm3.json` with a log script, test `pm3 log` and `pm3 log <name>`
  - Verify Ctrl+C cleanup, error messages for missing log field, multi-app prefixed output
  - Fix any issues found
  - Purpose: Ensure the log command works end-to-end
  - _Leverage: All source files_
  - _Requirements: All_
  - _Prompt: Implement the task for spec pm3-log-command, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer | Task: Build the project with npm run build. Create a test directory with a .pm3.json containing two apps, each with a log script that outputs timestamped lines (e.g., a bash script running `while true; do echo "$(date) log line"; sleep 1; done`). Test: (1) `pm3 log app1` shows live output from one app, (2) `pm3 log` shows prefixed output from all apps, (3) Ctrl+C cleanly exits, (4) `pm3 log` with an app missing log field shows warning and skips it, (5) `pm3 log nonexistent` shows error. Fix any bugs found during testing. Clean up test artifacts. | Restrictions: Only fix bugs — do not change architecture. | Success: All scenarios pass, clean Ctrl+C, no orphaned processes. | Instructions: Mark this task as [-] in tasks.md before starting. After completion, log implementation with log-implementation tool, then mark as [x] in tasks.md._
