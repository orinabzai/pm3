import fs from 'node:fs';
import path from 'node:path';

export interface AppConfig {
  name: string;
  script: string;
  cwd?: string;
  args?: string;
  log?: string;
}

export interface Pm3Config {
  apps: AppConfig[];
}

export interface ResolvedAppConfig {
  name: string;
  script: string;
  cwd: string;
  args: string;
  log?: string;
}

export interface ResolvedConfig {
  configDir: string;
  apps: ResolvedAppConfig[];
}

const CONFIG_FILENAME = '.pm3.json';

export function discoverConfig(startDir?: string): ResolvedConfig {
  const configPath = findConfigFile(startDir ?? process.cwd());
  if (!configPath) {
    throw new Error('No .pm3.json found in current directory or any parent directory');
  }

  const configDir = path.dirname(configPath);
  const raw = fs.readFileSync(configPath, 'utf-8');

  let parsed: Pm3Config;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid JSON in ${configPath}: ${(e as Error).message}`);
  }

  if (!parsed.apps || !Array.isArray(parsed.apps)) {
    throw new Error(`Invalid config: "apps" must be an array in ${configPath}`);
  }

  const seenNames = new Set<string>();
  const apps: ResolvedAppConfig[] = [];

  for (const app of parsed.apps) {
    if (!app.name || typeof app.name !== 'string') {
      console.warn(`Warning: skipping app entry with missing or invalid "name"`);
      continue;
    }
    if (!app.script || typeof app.script !== 'string') {
      console.warn(`Warning: skipping app "${app.name}" with missing or invalid "script"`);
      continue;
    }
    if (seenNames.has(app.name)) {
      console.warn(`Warning: duplicate app name "${app.name}" — using first occurrence`);
      continue;
    }
    seenNames.add(app.name);

    const resolvedCwd = app.cwd
      ? path.resolve(configDir, app.cwd)
      : configDir;

    const resolvedScript = path.resolve(resolvedCwd, app.script);

    const resolvedLog = app.log
      ? path.resolve(resolvedCwd, app.log)
      : undefined;

    apps.push({
      name: app.name,
      script: resolvedScript,
      cwd: resolvedCwd,
      args: app.args ?? '',
      log: resolvedLog,
    });
  }

  return { configDir, apps };
}

function findConfigFile(startDir: string): string | null {
  let dir = path.resolve(startDir);

  while (true) {
    const candidate = path.join(dir, CONFIG_FILENAME);
    if (fs.existsSync(candidate)) {
      return candidate;
    }

    const parent = path.dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
}
