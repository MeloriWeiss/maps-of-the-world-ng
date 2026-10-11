const { spawn } = require('node:child_process');
const { once } = require('node:events');
const path = require('node:path');

const workspaceRoot = path.resolve(__dirname, '../..');
const apiRoot = path.join(workspaceRoot, 'apps/api');
const entry = path.join(workspaceRoot, 'dist/apps/api/main.js');

process.env.NODE_ENV = 'development';
process.env.NX_BUILD_TARGET = 'api:build:development';
process.chdir(apiRoot);
const webpack = require('webpack');
const config = require(path.join(apiRoot, 'webpack.config.js'));
config.context = apiRoot;
config.mode = 'development';

let server = null;
let stopping = false;
let restartQueue = Promise.resolve();

async function stopServer() {
  const previous = server;
  if (!previous) return;
  server = null;
  if (previous.exitCode !== null || previous.signalCode !== null) return;
  const exited = once(previous, 'exit');
  previous.kill();
  await exited;
}

function scheduleRestart(success) {
  restartQueue = restartQueue.then(async () => {
    await stopServer();
    if (!success || stopping) return;
    const child = spawn(process.execPath, [entry], {
      cwd: workspaceRoot,
      env: { ...process.env, NODE_ENV: 'development' },
      stdio: 'inherit',
    });
    server = child;
    child.on('error', error => console.error('API process failed:', error));
    child.on('exit', code => {
      if (!stopping && server === child) console.error(`API process stopped (${code}). Waiting for changes.`);
    });
    console.log('API rebuilt; server restarted.');
  }).catch(error => console.error('API restart failed:', error));
}

const compiler = webpack(config);
const watcher = compiler.watch({ aggregateTimeout: 150 }, (error, stats) => {
  if (error) console.error(error);
  if (stats) console.log(stats.toString({ preset: 'errors-warnings', colors: process.stdout.isTTY }));
  scheduleRestart(!error && !!stats && !stats.hasErrors());
});

function shutdown() {
  if (stopping) return;
  stopping = true;
  watcher.close(() => {
    void restartQueue.then(stopServer).finally(() => { process.exitCode = 0; });
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
