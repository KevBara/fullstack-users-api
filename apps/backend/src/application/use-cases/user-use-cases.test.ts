import { describe, expect, it } from 'vitest';
import { listUsersUseCase } from './list-users-use-case';
import { createUser } from './create-user-use-case';

describe('listUsersUseCase', () => {
  it('returns paginated users in deterministic order', async () => {
    const repo = {
      list: async () => [
        { id: '2', name: 'Bob', email: 'bob@example.com', role: 'admin', active: true, createdAt: '2024-01-02T00:00:00.000Z' },
        { id: '1', name: 'Alice', email: 'alice@example.com', role: 'user', active: true, createdAt: '2024-01-01T00:00:00.000Z' },
      ],
      count: async () => 2,
    };

    const result = await listUsersUseCase(repo as any, { page: 1, pageSize: 10 });

    expect(result.total).toBe(2);
    expect(result.data[0].id).toBe('1');
    expect(result.data[1].id).toBe('2');
  });

  it('creates a valid user with normalized fields', async () => {
    const repo = {
      create: async (user: any) => user,
    };

    const user = await createUser(repo as any, {
      name: '  Carlos  ',
      email: 'CARLOS@EXAMPLE.COM',
      role: 'admin',
      active: true,
    });

    expect(user.name).toBe('Carlos');
    expect(user.email).toBe('carlos@example.com');
    expect(user.role).toBe('admin');
    expect(user.active).toBe(true);
  });
});
