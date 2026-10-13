import { sortUsersByCreatedAt, User } from '../../domain/user';
import { UserValidationError } from '../../domain/errors';
import type { UserFilters, UserRepository } from '../../domain/user-repository';

export interface ListUsersQuery {
  page?: number;
  pageSize?: number;
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  active?: boolean;
  q?: string;
}

export interface PaginatedUsersResponse {
  data: User[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export async function listUsersUseCase(
  repository: Pick<UserRepository, 'list' | 'count'>,
  query: ListUsersQuery = {},
): Promise<PaginatedUsersResponse> {
  const page = Number(query.page ?? 1);
  const pageSize = Number(query.pageSize ?? 10);
  if (!Number.isInteger(page) || page < 1) {
    throw new UserValidationError('La página debe ser un entero mayor que cero.');
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new UserValidationError('El tamaño de página debe ser un entero entre 1 y 100.');
  }
  for (const [field, value] of Object.entries({ id: query.id, name: query.name, email: query.email, q: query.q })) {
    if (value !== undefined && !value.trim()) {
      throw new UserValidationError(`El filtro '${field}' no puede estar vacío.`);
    }
  }
  if (query.role !== undefined && !['admin', 'user', 'manager'].includes(query.role)) {
    throw new UserValidationError('El filtro de rol no es válido.');
  }

  const safePage = page;
  const safePageSize = pageSize;
  const filters: UserFilters = {
    id: query.id,
    name: query.name,
    email: query.email,
    role: query.role as User['role'] | undefined,
    active: query.active,
    q: query.q,
  };

  const total = await repository.count(filters);
  const rows = await repository.list({ ...filters, page: safePage, pageSize: safePageSize });
  const ordered = sortUsersByCreatedAt(rows);
  const totalPages = total === 0 ? 0 : Math.ceil(total / safePageSize);

  return {
    data: ordered,
    page: safePage,
    pageSize: safePageSize,
    total,
    totalPages,
  };
}
