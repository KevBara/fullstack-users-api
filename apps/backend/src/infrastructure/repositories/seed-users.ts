import type { User } from '../../domain/user';

export const seedUsers: User[] = [
  {
    id: 'user-1',
    name: 'Alice',
    email: 'alice@example.com',
    role: 'admin',
    active: true,
    createdAt: '2024-01-01T09:00:00.000Z',
    updatedAt: '2024-01-01T09:00:00.000Z',
  },
  {
    id: 'user-2',
    name: 'Bob',
    email: 'bob@example.com',
    role: 'manager',
    active: true,
    createdAt: '2024-01-02T09:00:00.000Z',
    updatedAt: '2024-01-02T09:00:00.000Z',
  },
  {
    id: 'user-3',
    name: 'Charlie',
    email: 'charlie@example.com',
    role: 'user',
    active: false,
    createdAt: '2024-01-03T09:00:00.000Z',
    updatedAt: '2024-01-03T09:00:00.000Z',
  },
];