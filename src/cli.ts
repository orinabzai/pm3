#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { discoverConfig } from './config.js';
import { loadState, saveState, validateState } from './state.js';
import { startApp, stopApp, restartApp, listApps } from './manager.js';
import type { ResolvedAppConfig } from './config.js';

function findApp(apps: ResolvedAppConfig[], name: string): ResolvedAppConfig {
  const app = apps.find(a => a.name === name);
  if (!app) {
    console.error(`Error: app "${name}" not found in config`);
    process.exit(1);
    throw new Error('unreachable');
  }
  return app;
}

async function commandStart(name?: string): Promise<void> {
  try {
    const config = discoverConfig();
    let state = validateState(loadState(config.configDir));

    if (name) {
      const app = findApp(config.apps, name);
      state = startApp(app, state);
    } else {
      for (const app of config.apps) {
        state = startApp(app, state);
      }
    }

    saveState(config.configDir, state);
  } catch (e) {
    console.error((e as Error).message);
    process.exit(1);
  }
}

async function commandStop(name?: string): Promise<void> {
  try {
    const config = discoverConfig();
    let state = validateState(loadState(config.configDir));

    if (name) {
      findApp(config.apps, name);
      state = await stopApp(name, state);
    } else {
      for (const app of config.apps) {
        state = await stopApp(app.name, state);
      }
    }

    saveState(config.configDir, state);
  } catch (e) {
    console.error((e as Error).message);
    process.exit(1);
  }
}

async function commandRestart(name?: string): Promise<void> {
  try {
    const config = discoverConfig();
    let state = validateState(loadState(config.configDir));

    if (name) {
      const app = findApp(config.apps, name);
      state = await restartApp(app, state);
    } else {
      for (const app of config.apps) {
        state = await restartApp(app, state);
      }
    }

    saveState(config.configDir, state);
  } catch (e) {
    console.error((e as Error).message);
    process.exit(1);
  }
}

function commandList(): void {
  try {
    const config = discoverConfig();
    const state = validateState(loadState(config.configDir));
    listApps(config, state);
  } catch (e) {
    console.error((e as Error).message);
    process.exit(1);
  }
}

yargs(hideBin(process.argv))
  .scriptName('pm3')
  .usage('$0 <command> [name]')
  .command(
    'start [name]',
    'Start all or a specific app',
    (yargs) => yargs.positional('name', { type: 'string', describe: 'App name' }),
    (argv) => commandStart(argv.name),
  )
  .command(
    'stop [name]',
    'Stop all or a specific app',
    (yargs) => yargs.positional('name', { type: 'string', describe: 'App name' }),
    (argv) => commandStop(argv.name),
  )
  .command(
    'restart [name]',
    'Restart all or a specific app',
    (yargs) => yargs.positional('name', { type: 'string', describe: 'App name' }),
    (argv) => commandRestart(argv.name),
  )
  .command(
    'list',
    'List all apps and their status',
    () => {},
    () => commandList(),
  )
  .demandCommand(1, 'Please specify a command: start, stop, restart, or list')
  .strict()
  .help()
  .parse();
