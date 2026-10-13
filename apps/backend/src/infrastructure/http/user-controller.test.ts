import { describe, expect, it, vi } from 'vitest';
import { createUserController } from './user-controller';

describe('createUserController', () => {
  it('returns 201 and creates a user when payload is valid', async () => {
    const createUser = vi.fn().mockResolvedValue({
      id: 'user-1',
      name: 'Ana',
      email: 'ana@example.com',
      role: 'user',
      active: true,
      createdAt: '2024-01-01T00:00:00.000Z',
    });

    const controller = createUserController({ createUser } as any);
    const req = {
      body: {
        name: 'Ana',
        email: 'ana@example.com',
        role: 'user',
        active: true,
      },
    } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as any;

    await controller(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(createUser).toHaveBeenCalledWith(expect.objectContaining({ name: 'Ana' }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ email: 'ana@example.com' }) }));
  });
});
