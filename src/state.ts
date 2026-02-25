import fs from 'node:fs';
import path from 'node:path';

export interface AppState {
  name: string;
  pid: number | null;
  status: 'running' | 'stopped';
  startedAt: string | null;
}

export interface Pm3State {
  apps: Record<string, AppState>;
}

const STATE_FILENAME = '.pm3.state.json';

export function loadState(configDir: string): Pm3State {
  const statePath = path.join(configDir, STATE_FILENAME);
  try {
    const raw = fs.readFileSync(statePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.apps === 'object') {
      return parsed as Pm3State;
    }
    return { apps: {} };
  } catch {
    return { apps: {} };
  }
}

export function saveState(configDir: string, state: Pm3State): void {
  const statePath = path.join(configDir, STATE_FILENAME);
  const tmpPath = statePath + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf-8');
  fs.renameSync(tmpPath, statePath);
}

export function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function validateState(state: Pm3State): Pm3State {
  for (const [name, app] of Object.entries(state.apps)) {
    if (app.status === 'running' && app.pid !== null) {
      if (!isProcessRunning(app.pid)) {
        state.apps[name] = {
          ...app,
          status: 'stopped',
          pid: null,
          startedAt: null,
        };
      }
    }
  }
  return state;
}
