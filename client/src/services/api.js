import { queueRequest, syncQueue } from './SyncQueue';

const API_URL = 'http://localhost:5000/api';

const fetchApi = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  // Check connectivity
  if (!navigator.onLine && options.method !== 'GET') {
    console.log('App is offline. Queuing request for:', endpoint);
    await queueRequest(endpoint, options.method, options.body);
    return { offlineQueued: true, message: 'App offline. Action queued for sync.' };
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Something went wrong');
    }

    return data;
  } catch (err) {
    // If request failed due to network error and is a mutation, queue it
    if (options.method !== 'GET' && (err.message.includes('Failed to fetch') || !navigator.onLine)) {
      console.log('Network failure. Queuing request for:', endpoint);
      await queueRequest(endpoint, options.method, options.body);
      return { offlineQueued: true, message: 'Network error. Action queued for sync.' };
    }
    throw err;
  }
};

export const api = {
  get: (endpoint, options) => fetchApi(endpoint, { method: 'GET', ...options }),
  post: (endpoint, body, options) => fetchApi(endpoint, { method: 'POST', body, ...options }),
  put: (endpoint, body, options) => fetchApi(endpoint, { method: 'PUT', body, ...options }),
  delete: (endpoint, options) => fetchApi(endpoint, { method: 'DELETE', ...options }),
};

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncQueue(api);
  });
  // Also run sync immediately on load if we are online
  if (navigator.onLine) {
    syncQueue(api);
  }
}
