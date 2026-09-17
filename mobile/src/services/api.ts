const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export const api = {
  async get(endpoint: string) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      return await response.json();
    } catch (err) {
      console.warn(`[Mobile API Fallback] ${endpoint}:`, err);
      return null;
    }
  },

  async post(endpoint: string, body: any) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      return await response.json();
    } catch (err) {
      console.warn(`[Mobile API Fallback] ${endpoint}:`, err);
      throw err;
    }
  }
};
