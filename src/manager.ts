import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import type { ResolvedAppConfig, ResolvedConfig } from './config.js';
import { isProcessRunning } from './state.js';
import type { Pm3State } from './state.js';

export function startApp(app: ResolvedAppConfig, state: Pm3State): Pm3State {
  const existing = state.apps[app.name];
  if (existing?.status === 'running' && existing.pid !== null && isProcessRunning(existing.pid)) {
    console.log(`  ${app.name} is already running (PID ${existing.pid})`);
    return state;
  }

  const args = app.args ? app.args.split(/\s+/) : [];

  let logFd: number | undefined;
  try {
    if (app.log) {
      fs.mkdirSync(path.dirname(app.log), { recursive: true });
      logFd = fs.openSync(app.log, 'a');
    }

    const child = spawn('node', [app.script, ...args], {
      cwd: app.cwd,
      detached: true,
      stdio: app.log && logFd !== undefined
        ? ['ignore', logFd, logFd]
        : 'ignore',
    });

    child.unref();

    if (logFd !== undefined) {
      fs.closeSync(logFd);
      logFd = undefined;
    }

    const pid = child.pid ?? null;
    if (pid === null) {
      console.error(`  Failed to start ${app.name}: no PID returned`);
      state.apps[app.name] = {
        name: app.name,
        pid: null,
        status: 'stopped',
        startedAt: null,
      };
      return state;
    }

    console.log(`  ${app.name} started (PID ${pid})`);
    state.apps[app.name] = {
      name: app.name,
      pid,
      status: 'running',
      startedAt: new Date().toISOString(),
    };
  } catch (e) {
    if (logFd !== undefined) {
      try { fs.closeSync(logFd); } catch {}
    }
    console.error(`  Failed to start ${app.name}: ${(e as Error).message}`);
    state.apps[app.name] = {
      name: app.name,
      pid: null,
      status: 'stopped',
      startedAt: null,
    };
  }

  return state;
}

export async function stopApp(name: string, state: Pm3State): Promise<Pm3State> {
  const app = state.apps[name];
  if (!app || app.status !== 'running' || app.pid === null) {
    console.log(`  ${name} is not running`);
    return state;
  }

  const pid = app.pid;

  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    // Process already dead
    state.apps[name] = { ...app, status: 'stopped', pid: null, startedAt: null };
    console.log(`  ${name} stopped`);
    return state;
  }

  // Wait up to 5 seconds for graceful shutdown
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (!isProcessRunning(pid)) {
      state.apps[name] = { ...app, status: 'stopped', pid: null, startedAt: null };
      console.log(`  ${name} stopped (PID ${pid})`);
      return state;
    }
    await sleep(200);
  }

  // Force kill
  try {
    process.kill(pid, 'SIGKILL');
  } catch {
    // Already dead
  }
  state.apps[name] = { ...app, status: 'stopped', pid: null, startedAt: null };
  console.log(`  ${name} killed (PID ${pid})`);
  return state;
}

export async function restartApp(app: ResolvedAppConfig, state: Pm3State): Promise<Pm3State> {
  const existing = state.apps[app.name];
  if (existing?.status === 'running' && existing.pid !== null) {
    state = await stopApp(app.name, state);
  }
  return startApp(app, state);
}

export function listApps(config: ResolvedConfig, state: Pm3State): void {
  const nameWidth = Math.max(6, ...config.apps.map(a => a.name.length)) + 2;
  const statusWidth = 10;
  const pidWidth = 10;
  const uptimeWidth = 12;

  const header =
    'Name'.padEnd(nameWidth) +
    'Status'.padEnd(statusWidth) +
    'PID'.padEnd(pidWidth) +
    'Uptime'.padEnd(uptimeWidth) +
    'Log';

  console.log(header);
  console.log('-'.repeat(header.length + 10));

  for (const app of config.apps) {
    const appState = state.apps[app.name];
    const status = appState?.status ?? 'stopped';
    const pid = appState?.pid != null ? String(appState.pid) : 'N/A';
    const uptime = appState?.startedAt && status === 'running'
      ? formatUptime(new Date(appState.startedAt))
      : 'N/A';
    const log = app.log ?? 'N/A';

    console.log(
      app.name.padEnd(nameWidth) +
      status.padEnd(statusWidth) +
      pid.padEnd(pidWidth) +
      uptime.padEnd(uptimeWidth) +
      log
    );
  }
}

function formatUptime(startedAt: Date): string {
  const diff = Date.now() - startedAt.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export async function logApps(apps: ResolvedAppConfig[], name?: string): Promise<void> {
  const targets = name
    ? apps.filter(a => a.name === name)
    : apps;

  if (name && targets.length === 0) {
    console.error(`Error: app "${name}" not found in config`);
    process.exit(1);
  }

  const loggable = targets.filter(a => a.log);
  if (loggable.length === 0) {
    console.error(name
      ? `Error: app "${name}" has no log file configured`
      : 'Error: no apps have a log file configured');
    process.exit(1);
  }

  const children: ChildProcess[] = [];

  const cleanup = () => {
    for (const child of children) {
      try { child.kill(); } catch {}
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);

  if (loggable.length === 1) {
    const app = loggable[0];
    const child = spawn('tail', ['-f', app.log!], { stdio: ['ignore', 'inherit', 'inherit'] });
    children.push(child);
    await new Promise<void>((resolve) => child.on('close', () => resolve()));
  } else {
    const promises: Promise<void>[] = [];
    for (const app of loggable) {
      const child = spawn('tail', ['-f', app.log!], { stdio: ['ignore', 'pipe', 'pipe'] });
      children.push(child);

      const rlOut = createInterface({ input: child.stdout! });
      rlOut.on('line', (line) => console.log(`[${app.name}] ${line}`));

      const rlErr = createInterface({ input: child.stderr! });
      rlErr.on('line', (line) => console.error(`[${app.name}] ${line}`));

      promises.push(new Promise<void>((resolve) => child.on('close', () => resolve())));
    }
    await Promise.all(promises);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
