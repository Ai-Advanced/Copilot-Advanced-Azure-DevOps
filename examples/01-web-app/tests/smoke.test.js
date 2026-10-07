'use strict';

const { waitForRelease } = require('../scripts/smoke.cjs');
const originalFetch = global.fetch;
const origin = 'https://example.azurewebsites.net';
beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => {
  jest.useRealTimers();
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});
test('retries a cold-start timeout and checks the actual version', async () => {
  const timeout = new Error('cold start');
  timeout.name = 'TimeoutError';
  global.fetch = jest.fn().mockRejectedValueOnce(timeout).mockResolvedValue({
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => ({ status: 'ok', version: '1.0.0' }),
  });
  const promise = waitForRelease(origin, '1.0.0');
  await jest.advanceTimersByTimeAsync(10000);
  await promise;
  expect(global.fetch).toHaveBeenCalledTimes(2);
});
test('does not hide an invalid TLS certificate', async () => {
  const error = new TypeError('fetch failed', { cause: { code: 'CERT_HAS_EXPIRED' } });
  global.fetch = jest.fn().mockRejectedValue(error);
  await expect(waitForRelease(origin, '1.0.0')).rejects.toBe(error);
});
test('does not treat authorization failures as startup delays', async () => {
  global.fetch = jest.fn().mockResolvedValue({ status: 403 });
  await expect(waitForRelease(origin, '1.0.0')).rejects.toThrow('403');
});
test('a healthy but wrong version fails at the bounded deadline', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => ({ status: 'ok', version: '0.0.1' }),
  });
  const assertion = expect(waitForRelease(origin, '1.0.0')).rejects.toThrow('six minutes');
  await jest.advanceTimersByTimeAsync(360000);
  await assertion;
  expect(global.fetch).toHaveBeenCalledTimes(36);
});
