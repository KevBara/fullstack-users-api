import { randomUUID } from 'node:crypto';

import { UserValidationError } from '../../domain/errors';
import { CreateUserInput, normalizeUserInput, User } from '../../domain/user';
import type { UserRepository } from '../../domain/user-repository';

export async function createUser(
  repository: Pick<UserRepository, 'create'>,
  input: CreateUserInput,
): Promise<User> {
  const normalized = normalizeUserInput(input);

  // Las reglas de negocio se ejecutan aquí, no en el controlador.
  if (!normalized.name || normalized.name.length < 2) {
    throw new UserValidationError('El nombre debe tener al menos 2 caracteres.');
  }

  if (!normalized.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)) {
    throw new UserValidationError('Se requiere una dirección de correo electrónico válida.');
  }

  if (!normalized.role) {
    throw new UserValidationError('Se debe indicar un rol válido.');
  }

  const now = new Date().toISOString();

  const user: User = {
    id: randomUUID(),
    name: normalized.name,
    email: normalized.email,
    role: normalized.role,
    active: normalized.active,
    createdAt: now,
    updatedAt: now,
  };

  return repository.create(user);
}
