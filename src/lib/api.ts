const DEMO_USERS = [
  { id: 1, email: 'mutoporasimbarashe30@gmail.com', password: 'SimbaFarm2026!', full_name: 'SIMBA', role: 'admin' },
  { id: 1, email: 'admin@mutoporaz.com', password: 'admin123', full_name: 'Admin User', role: 'admin' },
  { id: 2, email: 'worker@mutoporaz.com', password: 'worker123', full_name: 'John Moyo', role: 'worker' },
  { id: 3, email: 'vet@mutoporaz.com', password: 'vet123', full_name: 'Dr. Sarah Chikore', role: 'vet' },
];

function makeToken(user) {
  return btoa(JSON.stringify({ id: user.id, email: user.email, full_name: user.full_name, role: user.role }));
}

async function apiRequest(url, options) {
  options = options || {};
  if (url.indexOf('/auth/login') !== -1) {
    const body = JSON.parse(options.body || '{}');
    const email = (body.email || '').toLowerCase();
    const user = DEMO_USERS.find(function(u) { return u.email.toLowerCase() === email && u.password === body.password; });
    if (!user) throw new Error('Invalid credentials');
    const token = makeToken(user);
    localStorage.setItem('mutoporaz_auth_token', token);
    localStorage.setItem('mutoporaz_user', JSON.stringify(user));
    return { token: token, user: user };
  }
  if (url.indexOf('/auth/me') !== -1) {
    const user = JSON.parse(localStorage.getItem('mutoporaz_user') || 'null');
    if (!user) throw new Error('Not authenticated');
    return user;
  }
  return [];
}

export const api = {
  get: function(url) { return apiRequest(url, {}); },
  post: function(url, body) { return apiRequest(url, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }); },
  put: function(url, body) { return apiRequest(url, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }); },
  delete: function(url) { return apiRequest(url, { method: 'DELETE' }); },
};

export function getAuthToken() { return localStorage.getItem('mutoporaz_auth_token'); }
export function setAuthToken(token) { localStorage.setItem('mutoporaz_auth_token', token); }
export function clearAuthToken() { localStorage.removeItem('mutoporaz_auth_token'); localStorage.removeItem('mutoporaz_user'); }
export class ApiError extends Error {
  constructor(message, status, data) { super(message); this.status = status; this.data = data; }
}
