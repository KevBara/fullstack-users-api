import { Readable } from 'node:stream';

import type { UserRepository } from '../../domain/user-repository';
import { User } from '../../domain/user';

function escapeCsv(value: string): string {
  const safe = String(value ?? '').replace(/"/g, '""');
  return `"${safe}"`;
}

function formatRow(user: User): string {
  return [
    user.id,
    user.name,
    user.email,
    user.role,
    String(user.active),
    user.createdAt,
  ].map((value) => escapeCsv(value)).join(',');
}

// Empleamos streaming para no acumular en memoria todo el conjunto de usuarios.
// Es una estrategia apropiada para escenarios con más de 5.000 registros.
export function exportUsersStream(repository: Pick<UserRepository, 'streamAll'>): Readable {
  const generator = (async function* () {
    yield 'id,name,email,role,active,createdAt\n';

    for await (const user of repository.streamAll()) {
      yield `${formatRow(user)}\n`;
    }
  })();

  return Readable.from(generator);
}
