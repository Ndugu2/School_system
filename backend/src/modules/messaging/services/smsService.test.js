const test = require('node:test');
const assert = require('node:assert/strict');
const { mock } = require('node:test');
const { sendSMS } = require('./smsService');

test('sandbox SMS is explicitly marked not delivered', async () => {
  const previous = {
    AT_API_KEY: process.env.AT_API_KEY,
    AT_USERNAME: process.env.AT_USERNAME,
    AT_ENVIRONMENT: process.env.AT_ENVIRONMENT,
  };
  Object.assign(process.env, { AT_API_KEY: 'test-key', AT_USERNAME: 'sandbox', AT_ENVIRONMENT: 'sandbox' });
  const fetchMock = mock.method(global, 'fetch', async () => {
    throw new Error('Sandbox must not call the live SMS API');
  });
  try {
    assert.deepEqual(await sendSMS('0700000000', 'test message'), {
      success: false,
      status: 'sandbox-not-delivered',
    });
  } finally {
    fetchMock.mock.restore();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('SMS rejects missing credentials and invalid Ugandan numbers', async () => {
  const oldKey = process.env.AT_API_KEY;
  const oldUsername = process.env.AT_USERNAME;
  delete process.env.AT_API_KEY;
  delete process.env.AT_USERNAME;
  try {
    await assert.rejects(sendSMS('0700000000', 'test'), /credentials are not configured/);
    process.env.AT_API_KEY = 'test-key';
    process.env.AT_USERNAME = 'sandbox';
    await assert.rejects(sendSMS('123', 'test'), /valid Ugandan phone number/);
  } finally {
    if (oldKey === undefined) delete process.env.AT_API_KEY;
    else process.env.AT_API_KEY = oldKey;
    if (oldUsername === undefined) delete process.env.AT_USERNAME;
    else process.env.AT_USERNAME = oldUsername;
  }
});
