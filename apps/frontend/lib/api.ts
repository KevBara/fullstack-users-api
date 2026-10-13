export type User = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'manager';
  active: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type PaginationResponse = {
  data: User[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type UserQueryFilters = {
  id?: string;
  name?: string;
  email?: string;
  role?: User['role'];
  active?: boolean;
  q?: string;
};

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export async function fetchUsers(page = 1, pageSize = 10, filters: UserQueryFilters = {}): Promise<PaginationResponse> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  });

  const res = await fetch(`${API_BASE}/users?${params.toString()}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error ?? 'No fue posible cargar los usuarios.');
  }

  return res.json();
}

export async function generateTestUsers(): Promise<{ count: number; total: number; message: string }> {
  const res = await fetch(`${API_BASE}/users/generate`, { method: 'POST' });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error ?? 'No fue posible generar los usuarios de prueba.');
  }
  return res.json();
}

export async function deleteAllUsers(): Promise<{ deleted: number; message: string }> {
  const res = await fetch(`${API_BASE}/users`, { method: 'DELETE' });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error ?? 'No fue posible limpiar los registros.');
  }
  return res.json();
}

export async function createUser(payload: Partial<User>): Promise<User> {
  const res = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error ?? 'No fue posible crear el usuario.');
  }

  const result = await res.json();
  return result.data;
}

export async function updateUser(id: string, payload: Partial<User>): Promise<User> {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error ?? 'No fue posible actualizar el usuario.');
  }

  const result = await res.json();
  return result.data;
}

export async function deleteUser(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok && res.status !== 204) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error ?? 'No fue posible eliminar el usuario.');
  }
}
