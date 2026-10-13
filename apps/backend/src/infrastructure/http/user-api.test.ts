import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../app';

describe('GET /api/v1/users filters', () => {
  it('filters by role and returns pagination totals for the filtered result', async () => {
    const response = await request(createApp())
      .get('/api/v1/users')
      .query({ role: 'manager', page: 1, pageSize: 10 });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe('user-2');
    expect(response.body.total).toBe(1);
    expect(response.body.totalPages).toBe(1);
  });

  it('filters by ID, status, and case-insensitive name search', async () => {
    const byId = await request(createApp()).get('/api/v1/users').query({ id: 'user-2' });
    const inactive = await request(createApp()).get('/api/v1/users').query({ active: 'false' });
    const byName = await request(createApp()).get('/api/v1/users').query({ name: 'ali' });
    const byEmail = await request(createApp()).get('/api/v1/users').query({ email: 'BOB@EXAMPLE.COM' });
    const byGeneralQuery = await request(createApp()).get('/api/v1/users').query({ q: 'CHARLIE' });

    expect(byId.body.data.map((user: { id: string }) => user.id)).toEqual(['user-2']);
    expect(inactive.body.data.map((user: { id: string }) => user.id)).toEqual(['user-3']);
    expect(byName.body.data.map((user: { id: string }) => user.id)).toEqual(['user-1']);
    expect(byEmail.body.data.map((user: { id: string }) => user.id)).toEqual(['user-2']);
    expect(byGeneralQuery.body.data.map((user: { id: string }) => user.id)).toEqual(['user-3']);
  });

  it('rejects invalid filter values with a client error', async () => {
    const response = await request(createApp())
      .get('/api/v1/users')
      .query({ role: 'owner' });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('rol');
  });

  it('rejects invalid pagination and returns 404 for missing users', async () => {
    const invalidPagination = await request(createApp())
      .get('/api/v1/users')
      .query({ pageSize: 101 });
    const missingUser = await request(createApp()).get('/api/v1/users/does-not-exist');

    expect(invalidPagination.status).toBe(400);
    expect(missingUser.status).toBe(404);
  });

  it('returns 400 when creating a user with an unsupported role', async () => {
    const response = await request(createApp())
      .post('/api/v1/users')
      .send({ name: 'Nuevo usuario', email: 'nuevo@example.com', role: 'owner' });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Rol no válido');
  });

  it('returns 409 when an update reuses another user email', async () => {
    const response = await request(createApp())
      .put('/api/v1/users/user-1')
      .send({ email: 'bob@example.com' });

    expect(response.status).toBe(409);
    expect(response.body.error).toContain('ya está en uso');
  });

  it('allows only one of two concurrent creates with the same email', async () => {
    const app = createApp();
    const payload = {
      name: 'Nuevo usuario',
      email: 'same@example.com',
      role: 'user',
    };
    const responses = await Promise.all([
      request(app).post('/api/v1/users').send(payload),
      request(app).post('/api/v1/users').send(payload),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
  });
});

describe('POST /api/v1/users/generate', () => {
  it('creates 5,000 test users in one request and reports the total', async () => {
    const app = createApp();
    const response = await request(app).post('/api/v1/users/generate');
    const repeatedName = await request(app).get('/api/v1/users').query({ name: 'Sofia', pageSize: 1 });

    expect(response.status).toBe(201);
    expect(response.body.count).toBe(5_000);
    expect(response.body.total).toBe(5_003);
    expect(response.body.message).toContain('5000');
    expect(repeatedName.body.total).toBeGreaterThan(1);
    expect(repeatedName.body.data[0].name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
    expect(repeatedName.body.data[0].email).toMatch(/^[a-z]+\.[a-z]+@example\.test$/);
  });

  it('disables test-data generation in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    try {
      const response = await request(createApp()).post('/api/v1/users/generate');
      expect(response.status).toBe(404);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe('DELETE /api/v1/users', () => {
  it('deletes all records and returns the number removed', async () => {
    const app = createApp();
    const response = await request(app).delete('/api/v1/users');
    const list = await request(app).get('/api/v1/users');

    expect(response.status).toBe(200);
    expect(response.body.deleted).toBe(3);
    expect(list.body.total).toBe(0);
    expect(list.body.data).toEqual([]);
  });

  it('disables data clearing in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    try {
      const response = await request(createApp()).delete('/api/v1/users');
      expect(response.status).toBe(404);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});