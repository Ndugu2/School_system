// Offline sync queue system storing failed API requests (like quiz attempts) in IndexedDB
// and automatically syncing them when connectivity is restored.

const DB_NAME = 'ndugu-academy-offline-db';
const STORE_NAME = 'sync-queue';

const openDatabase = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
};

export const queueRequest = async (endpoint, method, body) => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const record = { endpoint, method, body, timestamp: Date.now() };
      const request = store.add(record);
      request.onsuccess = () => {
        console.log('Request queued offline:', record);
        resolve(true);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('Failed to write to IndexedDB:', err);
  }
};

export const getQueuedRequests = async () => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    return [];
  }
};

export const deleteQueuedRequest = async (id) => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('Failed to delete from IndexedDB:', err);
  }
};

// Auto-sync process when browser detects back-online state
export const syncQueue = async (apiClient) => {
  const queued = await getQueuedRequests();
  if (queued.length === 0) return;

  console.log(`Found ${queued.length} requests queued offline. Starting sync...`);
  for (const req of queued) {
    try {
      if (req.method === 'POST') {
        await apiClient.post(req.endpoint, req.body);
      } else if (req.method === 'PUT') {
        await apiClient.put(req.endpoint, req.body);
      } else if (req.method === 'DELETE') {
        await apiClient.delete(req.endpoint);
      }
      await deleteQueuedRequest(req.id);
      console.log(`Synced request ${req.id} successfully.`);
    } catch (err) {
      console.error(`Failed to sync request ${req.id}:`, err);
      // Keep in queue for next retry
    }
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    // We will trigger synchronization in api.js or App.jsx
  });
}
