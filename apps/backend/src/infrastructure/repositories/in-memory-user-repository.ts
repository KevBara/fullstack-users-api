import { UserConflictError, UserNotFoundError } from '../../domain/errors';
import type { UserFilters, UserRepository } from '../../domain/user-repository';
import { sortUsersByCreatedAt, User } from '../../domain/user';
import { seedUsers } from './seed-users';

export class InMemoryUserRepository implements UserRepository {
  private users: User[] = [...seedUsers];

  private filterUsers(filters: UserFilters = {}): User[] {
    const normalizedName = filters.name?.toLocaleLowerCase();
    const normalizedEmail = filters.email?.toLocaleLowerCase();
    const normalizedQuery = filters.q?.toLocaleLowerCase();

    return this.users.filter((user) =>
      (!filters.id || user.id === filters.id)
      && (!normalizedName || user.name.toLocaleLowerCase().includes(normalizedName))
      && (!normalizedEmail || user.email.toLocaleLowerCase().includes(normalizedEmail))
      && (!filters.role || user.role === filters.role)
      && (filters.active === undefined || user.active === filters.active)
      && (!normalizedQuery || user.name.toLocaleLowerCase().includes(normalizedQuery) || user.email.toLocaleLowerCase().includes(normalizedQuery)),
    );
  }

  async list(params: UserFilters & { page?: number; pageSize?: number } = {}): Promise<User[]> {
    const page = Number(params.page ?? 1);
    const pageSize = Number(params.pageSize ?? 10);
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 10;
    const start = (safePage - 1) * safePageSize;

    return sortUsersByCreatedAt(this.filterUsers(params)).slice(start, start + safePageSize);
  }

  async count(filters: UserFilters = {}): Promise<number> {
    return this.filterUsers(filters).length;
  }

  async getById(id: string): Promise<User | null> {
    return this.users.find((user) => user.id === id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.toLocaleLowerCase();
    return this.users.find((user) => user.email.toLocaleLowerCase() === normalizedEmail) ?? null;
  }

  async create(user: User): Promise<User> {
    const duplicateEmail = this.users.some((current) => current.email.toLocaleLowerCase() === user.email.toLocaleLowerCase());
    if (duplicateEmail) {
      throw new UserConflictError(`El correo electrónico '${user.email}' ya está en uso.`);
    }

    this.users.push(user);
    return user;
  }

  async createMany(users: User[]): Promise<number> {
    this.users.push(...users);
    return users.length;
  }

  async update(id: string, changes: Partial<User>): Promise<User> {
    const index = this.users.findIndex((user) => user.id === id);

    if (index === -1) {
      throw new UserNotFoundError(id);
    }

    const duplicateEmail = changes.email
      ? this.users.find((user) => user.email.toLocaleLowerCase() === changes.email?.toLocaleLowerCase())
      : undefined;
    if (duplicateEmail && duplicateEmail.id !== id) {
      throw new UserConflictError(`El correo electrónico '${changes.email}' ya está en uso.`);
    }

    const updatedUser: User = {
      ...this.users[index],
      ...changes,
      updatedAt: new Date().toISOString(),
    };

    this.users[index] = updatedUser;
    return updatedUser;
  }

  async delete(id: string): Promise<void> {
    const index = this.users.findIndex((user) => user.id === id);

    if (index === -1) {
      throw new UserNotFoundError(id);
    }

    this.users.splice(index, 1);
  }

  async deleteAll(): Promise<number> {
    const count = this.users.length;
    this.users = [];
    return count;
  }

  async *streamAll(): AsyncIterable<User> {
    // La inserción conserva el orden de creación sin duplicar ni ordenar el conjunto antes de transmitirlo.
    for (const user of this.users) {
      yield user;
    }
  }
}
