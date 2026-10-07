'use strict';

const assert = require('node:assert/strict');
async function waitForRelease(url, expectedVersion) {
  const deadline = Date.now() + 360000;
  while (Date.now() < deadline) {
    let health;
    try {
      health = await fetch(new URL('/health', url), {
        signal: AbortSignal.timeout(Math.min(30000, deadline - Date.now())),
      });
    } catch (error) {
      const transient = error.name === 'TimeoutError' ||
        ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN', 'UND_ERR_CONNECT_TIMEOUT'].includes(error.cause?.code);
      if (!transient) throw error;
      console.warn(`Startup request failed (${error.cause?.code || error.name}); retrying within the six-minute deadline.`);
    }
    if (health?.status === 200 && health.headers.get('content-type')?.includes('application/json')) {
      const data = await health.json();
      if (data.status === 'ok' && data.version === expectedVersion) {
        return;
      }
      console.log(`Waiting for packaged version ${expectedVersion}; current version is ${data.version}.`);
    } else if (health) {
      assert([200, 404, 502, 503].includes(health.status), `Unexpected health status ${health.status}`);
      console.log(`Waiting for application startup: HTTP ${health.status}`);
    }
    await new Promise(resolve => setTimeout(resolve, Math.max(0, Math.min(10000, deadline - Date.now()))));
  }
  throw new Error('Expected release did not become healthy within six minutes.');
}

async function main() {
  const [origin, expectedVersion] = process.argv.slice(2);
  const url = new URL(origin);
  assert(url.protocol === 'https:' && url.hostname.endsWith('.azurewebsites.net'), 'Use the assigned Azure HTTPS origin.');
  assert(url.pathname === '/' && !url.search && !url.hash && !url.username && !url.password, 'Pass only the app origin.');
  assert(/^\d+\.\d+\.\d+$/.test(expectedVersion), 'Expected packaged version is required.');
  const endpoint = path => new URL(path, url);
  await waitForRelease(url, expectedVersion);
  const created = await fetch(endpoint('/users'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Pipeline Learner', email: `run${Date.now()}@example.invalid` }),
    signal: AbortSignal.timeout(30000),
  });
  assert.equal(created.status, 201);
  const user = await created.json();
  const response = await fetch(endpoint('/users'), { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200);
  assert((await response.json()).some(item => item.id === user.id && item.email === user.email));
  const invalid = await fetch(endpoint('/users'), {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Invalid', email: 'not-an-email' }),
    signal: AbortSignal.timeout(30000),
  });
  assert.equal(invalid.status, 400);
  assert.equal((await fetch(endpoint('/missing'), { signal: AbortSignal.timeout(30000) })).status, 404);
  console.log(`PASS: version ${expectedVersion}, create/read-back, input rejection, missing route.`);
}
if (require.main === module) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { waitForRelease };
