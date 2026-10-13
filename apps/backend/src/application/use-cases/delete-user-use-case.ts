import { UserNotFoundError } from '../../domain/errors';
import type { UserRepository } from '../../domain/user-repository';

export async function deleteUserUseCase(repository: Pick<UserRepository, 'delete' | 'getById'>, userId: string): Promise<void> {
  const existing = await repository.getById(userId);

  if (!existing) {
    throw new UserNotFoundError(userId);
  }

  await repository.delete(userId);
}
