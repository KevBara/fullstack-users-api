import { UserConflictError, UserNotFoundError, UserValidationError } from '../../domain/errors';
import { normalizeUserInput, UpdateUserInput, User } from '../../domain/user';
import type { UserRepository } from '../../domain/user-repository';

export async function updateUserUseCase(
  repository: Pick<UserRepository, 'getById' | 'update' | 'findByEmail'>,
  userId: string,
  input: UpdateUserInput,
): Promise<User> {
  const existing = await repository.getById(userId);

  if (!existing) {
    throw new UserNotFoundError(userId);
  }

  const normalized = normalizeUserInput(input);

  if (normalized.name !== undefined && normalized.name.length < 2) {
    throw new UserValidationError('El nombre debe tener al menos 2 caracteres.');
  }

  if (normalized.email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)) {
    throw new UserValidationError('Se requiere una dirección de correo electrónico válida.');
  }

  if (normalized.role !== undefined && !normalized.role) {
    throw new UserValidationError('Se debe indicar un rol válido.');
  }

  if (normalized.email) {
    const matchingUser = await repository.findByEmail(normalized.email);

    if (matchingUser && matchingUser.id !== userId) {
      throw new UserConflictError(`El correo electrónico '${normalized.email}' ya está en uso.`);
    }
  }

  return repository.update(userId, {
    ...existing,
    name: normalized.name ?? existing.name,
    email: normalized.email ?? existing.email,
    role: normalized.role ?? existing.role,
    active: typeof normalized.active === 'boolean' ? normalized.active : existing.active,
    updatedAt: new Date().toISOString(),
  });
}
