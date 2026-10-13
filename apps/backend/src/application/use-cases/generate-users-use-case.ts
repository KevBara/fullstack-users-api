import { randomUUID } from 'node:crypto';

import { UserValidationError } from '../../domain/errors';
import { User, UserRole } from '../../domain/user';
import type { UserRepository } from '../../domain/user-repository';

const MAX_GENERATED_USERS = 5_000;
const BATCH_SIZE = 250;
const roles: UserRole[] = ['admin', 'user', 'manager'];
const firstNames = [
  'Sofia', 'Mateo', 'Valentina', 'Santiago', 'Camila', 'Sebastian', 'Isabella', 'Nicolas',
  'Mariana', 'Daniel', 'Lucia', 'Gabriel', 'Martina', 'Samuel', 'Victoria', 'Alejandro',
  'Paula', 'Diego', 'Elena', 'Andres', 'Emma', 'Joaquin', 'Renata', 'Martin',
];
const lastNames = [
  'Garcia', 'Rodriguez', 'Martinez', 'Lopez', 'Gonzalez', 'Perez', 'Sanchez', 'Ramirez',
  'Torres', 'Flores', 'Rivera', 'Gomez', 'Diaz', 'Cruz', 'Morales', 'Reyes',
];

function createSampleUser(index: number, createdAt: number): User {
  const firstName = firstNames[index % firstNames.length];
  const lastName = lastNames[Math.floor(index / firstNames.length) % lastNames.length];
  const timestamp = new Date(createdAt + index).toISOString();

  return {
    id: randomUUID(),
    name: `${firstName} ${lastName}`,
    email: `${firstName.toLocaleLowerCase()}.${lastName.toLocaleLowerCase()}@example.test`,
    role: roles[index % roles.length],
    active: index % 4 !== 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export async function generateUsersUseCase(
  repository: Pick<UserRepository, 'createMany'>,
  count = MAX_GENERATED_USERS,
): Promise<number> {
  if (!Number.isInteger(count) || count < 1 || count > MAX_GENERATED_USERS) {
    throw new UserValidationError(`La cantidad debe ser un entero entre 1 y ${MAX_GENERATED_USERS}.`);
  }

  const createdAt = Date.now();
  let inserted = 0;

  for (let offset = 0; offset < count; offset += BATCH_SIZE) {
    const batch: User[] = [];
    const batchEnd = Math.min(offset + BATCH_SIZE, count);

    for (let index = offset; index < batchEnd; index += 1) {
      batch.push(createSampleUser(index, createdAt));
    }

    inserted += await repository.createMany(batch);
    await new Promise<void>((resolve) => setImmediate(resolve));
  }

  return inserted;
}