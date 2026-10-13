import { User } from './user';

export interface UserFilters {
  id?: string;
  name?: string;
  email?: string;
  role?: User['role'];
  active?: boolean;
  q?: string;
}

export interface UserRepository {
  list(params?: UserFilters & { page?: number; pageSize?: number }): Promise<User[]>;
  count(filters?: UserFilters): Promise<number>;
  getById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: User): Promise<User>;
  createMany(users: User[]): Promise<number>;
  update(id: string, changes: Partial<User>): Promise<User>;
  delete(id: string): Promise<void>;
  deleteAll(): Promise<number>;
  streamAll(): AsyncIterable<User>;
}
