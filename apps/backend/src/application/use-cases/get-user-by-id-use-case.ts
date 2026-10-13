import { UserNotFoundError } from '../../domain/errors';
import type { UserRepository } from '../../domain/user-repository';
import { User } from '../../domain/user';

export async function getUserByIdUseCase(
  repository: Pick<UserRepository, 'getById'>,
  userId: string,
): Promise<User> {
  const user = await repository.getById(userId);

  if (!user) {
    throw new UserNotFoundError(userId);
  }

  return user;
}
