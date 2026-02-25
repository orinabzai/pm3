# Design Document

## Overview

Adds log file capture and live tailing to pm3. When `pm3 start` launches an app with a `log` field configured, stdout and stderr are redirected to that file (append mode). The `pm3 log [name]` command tails configured log files to the terminal in real-time using `fs.watch`/polling with `fs.createReadStream`. For multiple apps, lines are prefixed with `[app-name]`.

## Code Reuse Analysis

### Existing Components to Leverage
- **`src/config.ts`**: Extend `AppConfig` and `ResolvedAppConfig` interfaces to include optional `log` field. Reuse `discoverConfig()` and path resolution logic (same pattern as `script`).
- **`src/manager.ts` `startApp()`**: Modify to open log file as write stream and pass as stdio when `log` is configured.
- **`src/cli.ts`**: Add new `commandLog` handler following existing `command<Name>` convention.

### Integration Points
- Config parsing in `config.ts` already resolves paths relative to `cwd` — the `log` field follows the same convention.
- `startApp()` already uses `spawn()` with `stdio` — we change from `'ignore'` to file descriptors when a log path is present.
- CLI in `cli.ts` already uses yargs with positional `[name]` pattern — log command reuses same structure.

## Components and Interfaces

### Changes to Config (`src/config.ts`)
- Add optional `log?: string` to `AppConfig` interface
- Add optional `log?: string` to `ResolvedAppConfig` interface (resolved absolute path)
- In `discoverConfig()`, resolve `log` relative to resolved `cwd` (same as `script`)

```typescript
// Added to AppConfig and ResolvedAppConfig
log?: string;
```

### Changes to `startApp()` (`src/manager.ts`)
- When `app.log` is defined:
  - Ensure the log file's parent directory exists (`fs.mkdirSync` with `recursive: true`)
  - Open the file with `fs.openSync(app.log, 'a')` for append mode
  - Pass as stdio: `['ignore', logFd, logFd]` (both stdout and stderr go to same file)
  - Close the fd after spawn with `fs.closeSync(logFd)` (child inherits it)
- When `app.log` is not defined: keep current `stdio: 'ignore'`

### New function: `logApps()` (`src/manager.ts`)
- **`logApps(apps: ResolvedAppConfig[], name?: string): Promise<void>`**
  - If `name` is provided, filter to that single app; error if not found or no `log` field
  - If no `name`, filter apps to only those with a `log` field; error if none
  - For single app: use `tail` approach — read existing content from end of file, then watch for changes
  - For multiple apps: same approach per app, but prefix each line with `[app-name]`
  - Register SIGINT handler to close all watchers and exit cleanly

### Tailing implementation
Use Node.js `fs.watch()` combined with `fs.createReadStream()`:
1. Record initial file size with `fs.statSync` (or 0 if file doesn't exist)
2. Start `fs.watchFile()` (polling-based, reliable cross-platform) on the log file
3. On each change, create a `ReadStream` from the previous offset to read new bytes
4. Use `readline.createInterface()` on the stream to emit lines
5. For single app: write lines directly to stdout
6. For multiple apps: prefix with `[app-name]`

```typescript
function tailFile(filePath: string, onLine: (line: string) => void): { close: () => void }
```

### Changes to CLI (`src/cli.ts`)
- Add `commandLog(name?: string): Promise<void>` handler
- Add yargs `.command('log [name]', 'Show live log output', ...)`
- Import `logApps` from manager

## Data Flow

### Start with log redirection (`pm3 start`)
```
fs.mkdirSync(logDir, recursive) → fs.openSync(logFile, 'a') → spawn(node, [script], { stdio: ['ignore', fd, fd] }) → fs.closeSync(fd)
```

### Single app tail (`pm3 log myapp`)
```
fs.watchFile(logFile) → on change → fs.createReadStream(from offset) → readline → stdout
```

### Multiple apps tail (`pm3 log`)
```
fs.watchFile(logFile1) → readline → prefix [app1] → stdout
fs.watchFile(logFile2) → readline → prefix [app2] → stdout
```

### Ctrl+C cleanup
```
SIGINT → fs.unwatchFile() for all → process.exit(0)
```

## Config Example

```json
{
  "apps": [
    {
      "name": "executor-api",
      "cwd": "./ts/apps/backend/workflow-executor-api",
      "script": "./dist/index.js",
      "log": "./logs/executor-api.log"
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

1. **App has no `log` field**: Skip when tailing all; error and exit(1) when targeting specific app
2. **No apps have `log` field**: Print error "No apps have a log file configured" and exit(1)
3. **Log file doesn't exist yet**: Start watching — when it appears, begin tailing from start
4. **Log directory doesn't exist on start**: Create it recursively with `fs.mkdirSync`
5. **Permission error on log file**: Print error with path and details
