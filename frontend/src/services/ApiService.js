import { API_URL } from '../config';
const BASE_URL = API_URL;

export const ApiService = {
  sync: async (userId, actions) => {
    const response = await fetch(`${BASE_URL}/sync/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, actions })
    });
    return response.json();
  },

  deltaSync: async (userId, lastSyncedAt) => {
    const response = await fetch(`${BASE_URL}/delta/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, last_synced_at: lastSyncedAt })
    });
    return response.json();
  },

  prefetch: async (userId, time) => {
    const response = await fetch(`${BASE_URL}/prefetch?user_id=${encodeURIComponent(userId)}&time=${encodeURIComponent(time)}`, {
      method: 'GET'
    });
    return response.json();
  },

  logBehavior: async (userId, event) => {
    const response = await fetch(`${BASE_URL}/behavior/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, event })
    });
    return response.json();
  }
};
