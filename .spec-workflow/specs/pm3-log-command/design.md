# Design Document

## Overview

Adds a `pm3 log [name]` command that spawns configured log scripts and streams their output to the terminal in real-time. When targeting all apps, output lines are prefixed with `[app-name]` for disambiguation. The command remains running until Ctrl+C, at which point all spawned log processes are cleanly terminated.

## Code Reuse Analysis

### Existing Components to Leverage
- **`src/config.ts`**: Extend `AppConfig` and `ResolvedAppConfig` interfaces to include optional `log` field. Reuse `discoverConfig()` and path resolution logic.
- **`src/cli.ts`**: Add new `commandLog` handler following the existing `command<Name>` convention. Reuse `findApp()` helper.
- **`src/manager.ts`**: Add `logApp` and `logApps` functions following existing patterns (spawn with `child_process`).

### Integration Points
- Config parsing in `config.ts` already resolves paths relative to `cwd` — the `log` field follows the same convention.
- CLI in `cli.ts` already uses yargs with positional `[name]` pattern — log command reuses same structure.

## Components and Interfaces

### Changes to Config (`src/config.ts`)
- Add optional `log?: string` to `AppConfig` interface
- Add optional `log?: string` to `ResolvedAppConfig` interface (resolved absolute path)
- In `discoverConfig()`, resolve `log` relative to resolved `cwd` (same as `script`)

```typescript
// Added to AppConfig
log?: string;

// Added to ResolvedAppConfig
log?: string;  // absolute path, resolved: cwd + log
```

### New function in Manager (`src/manager.ts`)
- **`logApps(apps: ResolvedAppConfig[], name?: string): void`**
  - If `name` is provided, filter to that single app
  - Filter apps to only those with a `log` field; error if none
  - For single app: spawn log script with `stdio: ['ignore', 'inherit', 'inherit']` — direct passthrough
  - For multiple apps: spawn each log script with `stdio: ['ignore', 'pipe', 'pipe']`, read stdout/stderr line by line, prefix each line with `[app-name]`
  - Register SIGINT handler to kill all spawned children on Ctrl+C
  - Return a Promise that resolves when all children exit or SIGINT is received

### Changes to CLI (`src/cli.ts`)
- Add `commandLog(name?: string): Promise<void>` handler
- Add yargs `.command('log [name]', ...)` delegating to `commandLog`
- `commandLog` calls `discoverConfig()` then `logApps(config.apps, name)`

## Data Flow

### Single app (`pm3 log myapp`)
```
spawn(log_script) → stdout/stderr → inherit → terminal
```

### Multiple apps (`pm3 log`)
```
spawn(log_script_1) → stdout → readline → prefix [app1] → console.log
spawn(log_script_2) → stdout → readline → prefix [app2] → console.log
...all concurrent, interleaved output
```

### Ctrl+C cleanup
```
SIGINT → kill all child processes → process.exit(0)
```

## Config Example

```json
{
  "apps": [
    {
      "name": "executor-api",
      "cwd": "./ts/apps/backend/workflow-executor-api",
      "script": "./dist/index.js",
      "log": "./logs/tail.sh"
    },
    {
      "name": "integration-service",
      "cwd": "./ts/apps/backend/integration-service",
      "script": "./dist/main.js",
      "args": "run"
    }
  ]
}
```

## Error Handling

1. **App has no `log` field**: Print warning and skip when logging all; print error and exit(1) when targeting specific app
2. **No apps have `log` field**: Print error "No apps have a log script configured" and exit(1)
3. **Log script fails to spawn**: Print error with script path, continue other apps
4. **Log script exits unexpectedly**: Print message, keep other log streams running
