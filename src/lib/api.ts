const DEMO_USERS = [
  { id: 1, email: 'admin@mutoporaz.com', password: 'admin123', full_name: 'Admin User', role: 'admin' as const },
  { id: 2, email: 'worker@mutoporaz.com', password: 'worker123', full_name: 'Worker User', role: 'worker' as const },
  { id: 3, email: 'vet@mutoporaz.com', password: 'vet123', full_name: 'Vet User', role: 'vet' as const },
];

function makeToken(user: any) {
  return btoa(JSON.stringify({ id: user.id, email: user.email, full_name: user.full_name, role: user.role }));
}

async function apiRequest<T>(url: string, options: any = {}): Promise<T> {
  if (url.includes('/auth/login')) {
    const body = JSON.parse(options.body || '{}');
    const user = DEMO_USERS.find(u => u.email === body.email && u.password === body.password);
    if (!user) throw new Error('Invalid credentials');
    const token = makeToken(user);
    localStorage.setItem('mutoporaz_auth_token', token);
    localStorage.setItem('mutoporaz_user', JSON.stringify(user));
    return { token, user } as any;
  }
  if (url.includes('/auth/me')) {
    const user = JSON.parse(localStorage.getItem('mutoporaz_user') || 'null');
    if (!user) throw new Error('Not authenticated');
    return user as any;
  }
  return [] as any;
}

export const api = {
  get: <T = any>(url: string) => apiRequest<T>(url),
  post: <T = any>(url: string, body?: any) => apiRequest<T>(url, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T = any>(url: string, body?: any) => apiRequest<T>(url, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T = any>(url: string) => apiRequest<T>(url, { method: 'DELETE' }),
};

export function getAuthToken() {
  return localStorage.getItem('mutoporaz_auth_token');
}
export function setAuthToken(token: string) {
  localStorage.setItem('mutoporaz_auth_token', token);
}
export function clearAuthToken() {
  localStorage.removeItem('mutoporaz_auth_token');
  localStorage.removeItem('mutoporaz_user');
}
export class ApiError extends Error {
  status: number; data: any;
  constructor(message: string, status: number, data: any) {
    super(message); this.status = status; this.data = data;
  }
}
.
