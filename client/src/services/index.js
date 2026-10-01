import { api } from './api.js';
import { storage, KEYS } from '../utils/storage.js';

/*
 * Domain services. UI components never call fetch or localStorage directly —
 * they call these functions, which map 1:1 onto the REST API:
 *
 *   POST /api/auth/register      POST /api/auth/login        GET /api/auth/me
 *   GET  /api/users/profile      PUT  /api/users/profile
 *   GET  /api/contacts           POST /api/contacts          PUT/DELETE /api/contacts/:id
 *   GET  /api/journeys           POST /api/journeys          PUT /api/journeys/:id
 *   POST /api/sos                PUT  /api/sos/:id           GET /api/sos/active
 *   GET  /api/safety-history     POST /api/safety-history
 *   GET  /api/card               PUT  /api/card              GET /api/card/public/:shareId
 *   GET  /api/settings           PUT  /api/settings
 */

export const authService = {
  async login(email, password) {
    const data = await api.post('/auth/login', { email, password }, { auth: false });
    storage.set(KEYS.token, data.token);
    storage.set(KEYS.user, data.user);
    return data.user;
  },
  async register(payload) {
    const data = await api.post('/auth/register', payload, { auth: false });
    storage.set(KEYS.token, data.token);
    storage.set(KEYS.user, data.user);
    return data.user;
  },
  async me() {
    const { user } = await api.get('/auth/me');
    storage.set(KEYS.user, user);
    return user;
  },
  logout() {
    storage.clearSession();
  },
  getToken: () => storage.get(KEYS.token),
  getCachedUser: () => storage.get(KEYS.user),
};

export const userService = {
  getProfile: () => api.get('/users/profile').then((d) => d.user),
  async updateProfile(patch) {
    const { user } = await api.put('/users/profile', patch);
    storage.set(KEYS.user, user);
    return user;
  },
  changePassword: (currentPassword, newPassword) => api.put('/users/password', { currentPassword, newPassword }),
  exportData: () => api.get('/users/export'),
  deleteAccount: () => api.delete('/users/me'),
};

export const contactService = {
  list: () => api.get('/contacts').then((d) => d.contacts),
  create: (contact) => api.post('/contacts', contact),
  update: (id, contact) => api.put(`/contacts/${id}`, contact),
  setPrimary: (id) => api.patch(`/contacts/${id}/primary`).then((d) => d.contacts),
  remove: (id) => api.delete(`/contacts/${id}`).then((d) => d.contacts),
};

export const journeyService = {
  list: (limit = 20) => api.get(`/journeys?limit=${limit}`).then((d) => d.journeys),
  getActive: () => api.get('/journeys/active').then((d) => d.journey),
  start: (journey) => api.post('/journeys', journey).then((d) => d.journey),
  checkIn: (id, pos) => api.put(`/journeys/${id}`, { action: 'checkin', ...pos }).then((d) => d.journey),
  complete: (id, pos) => api.put(`/journeys/${id}`, { action: 'complete', ...pos }).then((d) => d.journey),
  cancel: (id, pos) => api.put(`/journeys/${id}`, { action: 'cancel', ...pos }).then((d) => d.journey),
  extend: (id, minutes) => api.put(`/journeys/${id}`, { action: 'extend', minutes }).then((d) => d.journey),
  updateLocation: (id, pos) => api.put(`/journeys/${id}`, { action: 'location', ...pos }).then((d) => d.journey),
};

export const emergencyService = {
  getActive: () => api.get('/sos/active').then((d) => d.sos),
  list: () => api.get('/sos').then((d) => d.events),
  /** Records a SIMULATED SOS. No real services or contacts are notified. */
  trigger: (pos) => api.post('/sos', pos || {}).then((d) => d.sos),
  resolve: (id) => api.put(`/sos/${id}`, { action: 'resolve' }).then((d) => d.sos),
  cancel: (id) => api.put(`/sos/${id}`, { action: 'cancel' }).then((d) => d.sos),
};

export const historyService = {
  list: (from) => api.get(`/safety-history${from ? `?from=${encodeURIComponent(from)}` : ''}`),
  log: (type, detail, pos, title) => api.post('/safety-history', { type, detail, title, ...(pos || {}) }).then((d) => d.event),
  clear: () => api.delete('/safety-history'),
};

export const cardService = {
  get: () => api.get('/card').then((d) => d.card),
  update: (patch) => api.put('/card', patch).then((d) => d.card),
  regenerate: () => api.post('/card/regenerate').then((d) => d.card),
  getPublic: (shareId) => api.get(`/card/public/${encodeURIComponent(shareId)}`, { auth: false }),
};

export const settingsService = {
  get: () => api.get('/settings').then((d) => d.settings),
  update: (patch) => api.put('/settings', patch).then((d) => d.settings),
};
