# Tasks Document

- [x] 1. Project scaffolding and configuration
  - Files: `package.json`, `tsconfig.json`
  - Initialize Node.js project with TypeScript, configure `yargs` and `@types/yargs` as dependencies
  - Set up `tsconfig.json` with ES modules, strict mode, outDir `dist`
  - Configure `bin` field in `package.json` pointing to `dist/cli.js`
  - Add build script (`tsc`) and dev convenience scripts
  - Purpose: Establish project foundation so all subsequent tasks can compile and run
  - _Requirements: Non-functional (Code Architecture)_
  - _Prompt: Implement the task for spec pm3-spec, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Node.js/TypeScript DevOps Developer | Task: Scaffold the pm3 project with package.json (name: "pm3", bin pointing to dist/cli.js, scripts for build) and tsconfig.json (strict, ES modules, outDir dist). Install yargs and @types/yargs. | Restrictions: Do not create any source files yet — only project config. Use npm. Do not add unnecessary dependencies. | Success: `npm install` succeeds, `npx tsc --noEmit` succeeds (with no source files, that's fine), package.json has correct bin field. | Instructions: Mark this task as [-] in tasks.md before starting. After completion, log implementation with log-implementation tool, then mark as [x] in tasks.md._

- [x] 2. Config discovery and parser module
  - File: `src/config.ts`
  - Implement `discoverConfig(startDir?)` that walks from CWD upward to find `.pm3.json`
  - Parse JSON, validate required fields (`name`, `script`), warn on duplicates
  - Resolve `cwd` relative to config file directory; resolve `script` relative to resolved `cwd`
  - Store `args` as string (pass-through)
  - Export interfaces: `AppConfig`, `Pm3Config`, `ResolvedConfig`, `ResolvedAppConfig`
  - Purpose: Core config layer that all commands depend on
  - _Leverage: Node.js fs, path built-ins_
  - _Requirements: 1, 2_
  - _Prompt: Implement the task for spec pm3-spec, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Node.js Developer specializing in filesystem operations and config parsing | Task: Create src/config.ts implementing config discovery (walk directories upward from startDir to root looking for .pm3.json) and parsing (validate apps array, required fields name/script, warn on duplicates). Resolve cwd relative to config file directory, resolve script relative to resolved cwd, keep args as string. Export all interfaces (AppConfig, Pm3Config, ResolvedConfig, ResolvedAppConfig) and discoverConfig function. | Restrictions: Do not use any external dependencies. Use only Node.js fs and path. Do not handle process spawning — that belongs in manager.ts. If cwd is not specified, default to the config file directory. | _Leverage: Design document Component 2 interfaces and behavior specification | Success: discoverConfig correctly finds .pm3.json walking upward, returns ResolvedConfig with absolute paths, skips invalid entries with console warnings, throws clear error when no config found. | Instructions: Mark this task as [-] in tasks.md before starting. After completion, log implementation with log-implementation tool, then mark as [x] in tasks.md._

- [x] 3. State manager module
  - File: `src/state.ts`
  - Implement `loadState(configDir)`, `saveState(configDir, state)`, `isProcessRunning(pid)`, `validateState(state)`
  - State file: `.pm3.state.json` in configDir
  - Atomic writes (write temp file, rename)
  - PID validation via `process.kill(pid, 0)`
  - Graceful handling of corrupted/missing state file
  - Export interfaces: `AppState`, `Pm3State`
  - Purpose: Persistent state tracking across CLI invocations
  - _Leverage: Node.js fs, path, process built-ins_
  - _Requirements: 7_
  - _Prompt: Implement the task for spec pm3-spec, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Node.js Developer specializing in file I/O and process management | Task: Create src/state.ts implementing state persistence. loadState reads .pm3.state.json from configDir (returns empty state if missing/corrupted). saveState writes atomically (write to .pm3.state.json.tmp then rename). isProcessRunning uses process.kill(pid, 0) wrapped in try/catch. validateState iterates all entries and marks dead PIDs as stopped. Export AppState and Pm3State interfaces. | Restrictions: Do not use external dependencies. Handle all edge cases (file not found, invalid JSON, permission errors) gracefully. Do not import from manager.ts. | _Leverage: Design document Component 3 interfaces and behavior specification | Success: loadState handles missing/corrupt files, saveState writes atomically, isProcessRunning correctly detects live/dead PIDs, validateState cleans stale entries. | Instructions: Mark this task as [-] in tasks.md before starting. After completion, log implementation with log-implementation tool, then mark as [x] in tasks.md._

- [x] 4. Process manager module
  - File: `src/manager.ts`
  - Implement `startApp(app, state)`: spawn detached process, store PID, skip if already running
  - Implement `stopApp(name, state)`: SIGTERM, wait 5s timeout, SIGKILL fallback, update state
  - Implement `restartApp(app, state)`: stop then start
  - Implement `listApps(config, state)`: print formatted table (name, status, PID, uptime)
  - Purpose: Core process lifecycle management
  - _Leverage: src/state.ts (isProcessRunning, AppState, Pm3State), Node.js child_process, process_
  - _Requirements: 3, 4, 5, 6_
  - _Prompt: Implement the task for spec pm3-spec, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Node.js Developer specializing in child process management | Task: Create src/manager.ts implementing four functions. startApp: check if already running via state, spawn with child_process.spawn using detached:true and stdio:'ignore', call unref(), record PID and startedAt in state. stopApp: send SIGTERM via process.kill, wait up to 5 seconds polling isProcessRunning, send SIGKILL if still alive, update state to stopped. restartApp: call stopApp if running then startApp. listApps: print a formatted table showing name, status, PID (or N/A), and uptime for each configured app. args string should be split by whitespace and passed as the args array to spawn. | Restrictions: Do not read config files — receive ResolvedAppConfig as parameter. Import types and helpers from state.ts and config.ts. Do not use external dependencies for table formatting — use console.log with padded strings. | _Leverage: Design document Component 4 interfaces, src/state.ts for isProcessRunning and types | Success: Processes spawn detached and survive CLI exit, stop sends SIGTERM then SIGKILL after timeout, list shows accurate status table, restart works for both running and stopped apps. | Instructions: Mark this task as [-] in tasks.md before starting. After completion, log implementation with log-implementation tool, then mark as [x] in tasks.md._

- [x] 5. CLI entry point with yargs
  - File: `src/cli.ts`
  - Set up yargs with four commands: `start [name]`, `stop [name]`, `restart [name]`, `list`
  - Each command handler: discover config, load and validate state, call appropriate manager function, save state
  - Add shebang line (`#!/usr/bin/env node`) for bin usage
  - Handle errors at top level (config not found, unknown app name) with clean console output and process.exit(1)
  - Purpose: User-facing CLI interface tying all modules together
  - _Leverage: src/config.ts (discoverConfig), src/state.ts (loadState, saveState, validateState), src/manager.ts (startApp, stopApp, restartApp, listApps), yargs_
  - _Requirements: 1, 3, 4, 5, 6_
  - _Prompt: Implement the task for spec pm3-spec, first run spec-workflow-guide to get the workflow guide then implement the task: Role: CLI Developer specializing in Node.js command-line tools | Task: Create src/cli.ts as the main entry point. Add shebang line. Use yargs to define four commands: start [name] (optional positional), stop [name] (optional positional), restart [name] (optional positional), list. Each command handler should: call discoverConfig(), call loadState + validateState, execute the appropriate manager function (for all apps if no name given, single app if name provided), call saveState, handle errors. If name is provided but not found in config, print error and exit(1). | Restrictions: Keep command handlers thin — delegate logic to manager.ts. Do not duplicate validation logic. Use yargs .demandCommand() to require a command. | _Leverage: All other modules (config.ts, state.ts, manager.ts), yargs library | Success: `pm3 start` starts all apps, `pm3 start myapp` starts one, `pm3 stop` stops all, `pm3 list` shows table, `pm3 --help` shows usage, unknown commands show error. | Instructions: Mark this task as [-] in tasks.md before starting. After completion, log implementation with log-implementation tool, then mark as [x] in tasks.md._

- [x] 6. Build, link, and end-to-end validation
  - Files: No new files — verify existing build pipeline
  - Run `npm run build` to compile TypeScript
  - Run `npm link` to make `pm3` available globally
  - Test full flow: create a test `.pm3.json` with a simple node script, run `pm3 start`, `pm3 list`, `pm3 restart`, `pm3 stop`
  - Verify state file is created and cleaned up correctly
  - Fix any issues discovered during E2E testing
  - Purpose: Ensure the complete tool works end-to-end
  - _Leverage: All source files, package.json build config_
  - _Requirements: All_
  - _Prompt: Implement the task for spec pm3-spec, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer specializing in CLI tool testing | Task: Build the project with npm run build. Link globally with npm link. Create a test .pm3.json in a temp directory with a simple long-running node script (e.g., setInterval). Run pm3 start, verify processes spawn (check PIDs). Run pm3 list, verify table output. Run pm3 restart, verify new PIDs. Run pm3 stop, verify processes terminated. Check .pm3.state.json is updated correctly at each step. Fix any bugs discovered. | Restrictions: Do not change the architecture — only fix bugs found during testing. Clean up test artifacts after validation. | Success: All four commands work correctly end-to-end, state file tracks PIDs accurately, processes spawn detached and survive CLI exit, stop terminates processes cleanly. | Instructions: Mark this task as [-] in tasks.md before starting. After completion, log implementation with log-implementation tool, then mark as [x] in tasks.md._
