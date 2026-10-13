import { UserValidationError } from './errors';

export const USER_ROLES = ['admin', 'user', 'manager'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  role: UserRole;
  active?: boolean;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: UserRole;
  active?: boolean;
}

// Centralizamos la normalización del dominio para garantizar que los datos
// lleguen limpios a los casos de uso y al repositorio.
export function normalizeUserInput(input: Partial<CreateUserInput | UpdateUserInput>): Required<Pick<CreateUserInput, 'active'>> & {
  name?: string;
  email?: string;
  role?: UserRole;
} {
  const cleanedName = typeof input.name === 'string' ? input.name.trim() : undefined;
  const cleanedEmail = typeof input.email === 'string' ? input.email.trim().toLowerCase() : undefined;
  const cleanedRole = typeof input.role === 'string' ? input.role.toLowerCase() as UserRole : undefined;

  if (cleanedRole && !USER_ROLES.includes(cleanedRole)) {
    throw new UserValidationError(`Rol no válido: ${cleanedRole}`);
  }

  return {
    name: cleanedName,
    email: cleanedEmail,
    role: cleanedRole,
    active: typeof input.active === 'boolean' ? input.active : true,
  };
}

export function sortUsersByCreatedAt(users: User[]): User[] {
  return [...users].sort((left, right) => {
    const leftTime = new Date(left.createdAt).getTime();
    const rightTime = new Date(right.createdAt).getTime();
    return leftTime - rightTime || left.id.localeCompare(right.id);
  });
}
