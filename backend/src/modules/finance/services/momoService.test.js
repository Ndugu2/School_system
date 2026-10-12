const test = require('node:test');
const assert = require('node:assert/strict');
const { mock } = require('node:test');
const { createCollectionRequest, getCollectionStatus, resetTokenCache } = require('./momoService');

const withMomoEnvironment = async callback => {
  const names = [
    'MTN_MOMO_SUBSCRIPTION_KEY',
    'MTN_MOMO_API_USER',
    'MTN_MOMO_API_KEY',
    'MTN_MOMO_TARGET_ENVIRONMENT',
    'MTN_MOMO_CURRENCY',
  ];
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  Object.assign(process.env, {
    MTN_MOMO_SUBSCRIPTION_KEY: 'subscription-test',
    MTN_MOMO_API_USER: 'user-test',
    MTN_MOMO_API_KEY: 'key-test',
    MTN_MOMO_TARGET_ENVIRONMENT: 'sandbox',
    MTN_MOMO_CURRENCY: 'UGX',
  });
  resetTokenCache();
  try {
    await callback();
  } finally {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
    resetTokenCache();
  }
};

test('creates an MTN collection request using an access token and explicit UGX values', async () => {
  await withMomoEnvironment(async () => {
    const calls = [];
    const fetchMock = mock.method(global, 'fetch', async (url, options) => {
      calls.push({ url, options });
      if (url.endsWith('/collection/token/')) {
        return { ok: true, status: 200, json: async () => ({ access_token: 'access-test', expires_in: 3600 }) };
      }
      return { ok: true, status: 202, json: async () => ({}) };
    });
    try {
      const result = await createCollectionRequest({
        referenceId: 'reference-1',
        externalId: 'external-1',
        amount: 120000,
        phoneNumber: '256700000000',
        callbackUrl: 'https://school.example/api/finance/momo/callback',
      });
      assert.deepEqual(result, { currency: 'UGX' });
      assert.equal(calls.length, 2);
      assert.equal(calls[1].options.headers.Authorization, 'Bearer access-test');
      assert.equal(calls[1].options.headers['X-Reference-Id'], 'reference-1');
      assert.equal(calls[1].options.headers['X-Callback-Url'], 'https://school.example/api/finance/momo/callback');
      assert.deepEqual(JSON.parse(calls[1].options.body), {
        amount: '120000',
        currency: 'UGX',
        externalId: 'external-1',
        payer: { partyIdType: 'MSISDN', partyId: '256700000000' },
        payerMessage: 'School fees payment',
        payeeNote: 'School fees',
      });
    } finally {
      fetchMock.mock.restore();
    }
  });
});

test('queries MTN for payment status rather than trusting a callback payload', async () => {
  await withMomoEnvironment(async () => {
    const calls = [];
    const fetchMock = mock.method(global, 'fetch', async (url, options) => {
      calls.push({ url, options });
      if (url.endsWith('/collection/token/')) {
        return { ok: true, status: 200, json: async () => ({ access_token: 'access-test', expires_in: 3600 }) };
      }
      return { ok: true, status: 200, json: async () => ({ status: 'SUCCESSFUL', externalId: 'external-1' }) };
    });
    try {
      const status = await getCollectionStatus('reference/with spaces');
      assert.equal(status.status, 'SUCCESSFUL');
      assert.match(calls[1].url, /reference%2Fwith%20spaces$/);
      assert.equal(calls[1].options.headers['X-Target-Environment'], 'sandbox');
    } finally {
      fetchMock.mock.restore();
    }
  });
});

test('fails explicitly when MTN credentials are missing', async () => {
  const oldKey = process.env.MTN_MOMO_SUBSCRIPTION_KEY;
  delete process.env.MTN_MOMO_SUBSCRIPTION_KEY;
  resetTokenCache();
  try {
    await assert.rejects(createCollectionRequest({
      referenceId: 'reference-1',
      externalId: 'external-1',
      amount: 1000,
      phoneNumber: '256700000000',
      callbackUrl: 'https://school.example/api/finance/momo/callback',
    }), /MTN MoMo requires/);
  } finally {
    if (oldKey !== undefined) process.env.MTN_MOMO_SUBSCRIPTION_KEY = oldKey;
  }
});
