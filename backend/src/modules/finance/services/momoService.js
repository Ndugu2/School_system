const MTN_BASE_URL = process.env.MTN_MOMO_BASE_URL || 'https://sandbox.momodeveloper.mtn.com';
const MTN_TARGET_ENVIRONMENT = process.env.MTN_MOMO_TARGET_ENVIRONMENT || 'sandbox';
let tokenCache;

const getCredentials = () => {
  const { MTN_MOMO_SUBSCRIPTION_KEY, MTN_MOMO_API_USER, MTN_MOMO_API_KEY } = process.env;
  if (!MTN_MOMO_SUBSCRIPTION_KEY || !MTN_MOMO_API_USER || !MTN_MOMO_API_KEY) {
    throw new Error('MTN MoMo requires MTN_MOMO_SUBSCRIPTION_KEY, MTN_MOMO_API_USER, and MTN_MOMO_API_KEY');
  }
  const baseUrl = new URL(MTN_BASE_URL);
  if (baseUrl.protocol !== 'https:' || baseUrl.hostname !== 'sandbox.momodeveloper.mtn.com' &&
      !baseUrl.hostname.endsWith('.mtn.com')) {
    throw new Error('MTN MoMo base URL must use HTTPS on an MTN domain');
  }
  return { subscriptionKey: MTN_MOMO_SUBSCRIPTION_KEY, apiUser: MTN_MOMO_API_USER, apiKey: MTN_MOMO_API_KEY };
};

const requestJson = async (url, options, context) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`${context} failed with HTTP ${response.status}`);
  }
  if (response.status === 202 || response.status === 204) return {};
  return response.json();
};

const getAccessToken = async () => {
  const credentials = getCredentials();
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) return tokenCache.value;
  const basic = Buffer.from(`${credentials.apiUser}:${credentials.apiKey}`).toString('base64');
  const result = await requestJson(`${MTN_BASE_URL}/collection/token/`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Ocp-Apim-Subscription-Key': credentials.subscriptionKey,
    },
  }, 'MTN MoMo token request');
  if (!result.access_token || !Number.isFinite(Number(result.expires_in))) {
    throw new Error('MTN MoMo returned an invalid access token response');
  }
  tokenCache = {
    value: result.access_token,
    expiresAt: Date.now() + Number(result.expires_in) * 1000,
  };
  return tokenCache.value;
};

const createCollectionRequest = async ({ referenceId, externalId, amount, phoneNumber, callbackUrl }) => {
  const credentials = getCredentials();
  if (!/^[a-z0-9-]+$/.test(MTN_TARGET_ENVIRONMENT)) {
    throw new Error('MTN_MOMO_TARGET_ENVIRONMENT contains invalid characters');
  }
  const token = await getAccessToken();
  const currency = process.env.MTN_MOMO_CURRENCY || 'UGX';
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('MTN_MOMO_CURRENCY must be a three-letter currency code');
  await requestJson(`${MTN_BASE_URL}/collection/v1_0/requesttopay`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Reference-Id': referenceId,
      'X-Target-Environment': MTN_TARGET_ENVIRONMENT,
      'Ocp-Apim-Subscription-Key': credentials.subscriptionKey,
      'Content-Type': 'application/json',
      'X-Callback-Url': callbackUrl,
    },
    body: JSON.stringify({
      amount: String(amount),
      currency,
      externalId,
      payer: { partyIdType: 'MSISDN', partyId: phoneNumber },
      payerMessage: 'School fees payment',
      payeeNote: 'School fees',
    }),
  }, 'MTN MoMo payment request');
  return { currency };
};

const getCollectionStatus = async (referenceId) => {
  const credentials = getCredentials();
  const token = await getAccessToken();
  return requestJson(`${MTN_BASE_URL}/collection/v1_0/requesttopay/${encodeURIComponent(referenceId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Target-Environment': MTN_TARGET_ENVIRONMENT,
      'Ocp-Apim-Subscription-Key': credentials.subscriptionKey,
    },
  }, 'MTN MoMo payment status request');
};

const resetTokenCache = () => { tokenCache = undefined; };

module.exports = { createCollectionRequest, getCollectionStatus, resetTokenCache };
