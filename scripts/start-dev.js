const { spawn, spawnSync } = require('node:child_process');

const portToFree = 5000;

function ensurePortFree(port) {
  const platform = process.platform;

  if (platform === 'win32') {
    const result = spawnSync('powershell', [
      '-NoProfile',
      '-Command',
      `Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }`
    ], { stdio: 'inherit' });
    return result.status === 0;
  }

  const result = spawnSync('bash', ['-lc', `lsof -ti tcp:${port} | xargs -r kill -9 || fuser -k ${port}/tcp 2>/dev/null || true`], { stdio: 'inherit' });
  return result.status === 0;
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
    });

    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });

    child.on('error', reject);
  });
}

(async () => {
  console.log(`[startup] Clearing stale processes on port ${portToFree}...`);
  ensurePortFree(portToFree);

  console.log('[startup] Starting backend and web app...');

  try {
    await runCommand('npx', ['concurrently', '"npm run dev --prefix backend"', '"npm run dev --prefix web"']);
  } catch (error) {
    console.error('[startup] Failed to start app stack:', error.message);
    process.exit(1);
  }
})();
