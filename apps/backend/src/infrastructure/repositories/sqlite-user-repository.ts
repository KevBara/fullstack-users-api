import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import { UserConflictError, UserNotFoundError } from '../../domain/errors';
import type { User } from '../../domain/user';
import type { UserFilters, UserRepository } from '../../domain/user-repository';
import { seedUsers } from './seed-users';

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: User['role'];
  active: number;
  created_at: string;
  updated_at: string | null;
};

const insertSql = `
  INSERT INTO users (id, name, email, role, active, created_at, updated_at)
  VALUES (@id, @name, @email, @role, @active, @createdAt, @updatedAt)
`;

function toUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    active: row.active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  };
}

export class SqliteUserRepository implements UserRepository {
  private readonly database: Database.Database;

  constructor(databasePath: string) {
    mkdirSync(dirname(databasePath), { recursive: true });
    this.database = new Database(databasePath);
    this.database.pragma('journal_mode = WAL');
    this.database.pragma('busy_timeout = 5000');
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL COLLATE NOCASE,
        role TEXT NOT NULL CHECK (role IN ('admin', 'user', 'manager')),
        active INTEGER NOT NULL CHECK (active IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_users_created_at_id ON users (created_at, id);
      CREATE INDEX IF NOT EXISTS idx_users_role_active ON users (role, active);
      CREATE TABLE IF NOT EXISTS app_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    this.migrateDuplicateGeneratedEmails();
  }

  private migrateDuplicateGeneratedEmails(): void {
    const schema = this.database.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'").get() as { sql: string };
    if (!schema.sql.toLocaleLowerCase().includes('email text not null collate nocase unique')) {
      return;
    }

    const migrate = this.database.transaction(() => {
      this.database.exec(`
        DROP INDEX IF EXISTS idx_users_created_at_id;
        DROP INDEX IF EXISTS idx_users_role_active;
        ALTER TABLE users RENAME TO users_with_unique_email;
        CREATE TABLE users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL COLLATE NOCASE,
          role TEXT NOT NULL CHECK (role IN ('admin', 'user', 'manager')),
          active INTEGER NOT NULL CHECK (active IN (0, 1)),
          created_at TEXT NOT NULL,
          updated_at TEXT
        );
        INSERT INTO users (id, name, email, role, active, created_at, updated_at)
          SELECT id, name, email, role, active, created_at, updated_at FROM users_with_unique_email;
        DROP TABLE users_with_unique_email;
        CREATE INDEX idx_users_created_at_id ON users (created_at, id);
        CREATE INDEX idx_users_role_active ON users (role, active);
      `);
    });
    migrate.immediate();
  }

  async seedIfEmpty(): Promise<void> {
    const seeded = this.database.prepare("SELECT value FROM app_metadata WHERE key = 'initial-seed'").get();
    if (!seeded) {
      const existingUsers = this.database.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number };
      // El marcador vive fuera de la tabla de usuarios para que limpiar datos no vuelva a sembrarlos al reiniciar.
      const seed = this.database.transaction(() => {
        if (existingUsers.count === 0) {
          const insert = this.database.prepare(insertSql);
          for (const user of seedUsers) {
            insert.run({ ...user, active: user.active ? 1 : 0, createdAt: user.createdAt, updatedAt: user.updatedAt ?? null });
          }
        }
        this.database.prepare("INSERT INTO app_metadata (key, value) VALUES ('initial-seed', 'done')").run();
      });
      seed.immediate();
    }
  }

  private buildWhere(filters: UserFilters = {}): { sql: string; values: Record<string, string | number> } {
    const clauses: string[] = [];
    const values: Record<string, string | number> = {};

    if (filters.id) {
      clauses.push('id = @id');
      values.id = filters.id;
    }
    if (filters.name) {
      clauses.push('name LIKE @name COLLATE NOCASE');
      values.name = `%${filters.name}%`;
    }
    if (filters.email) {
      clauses.push('email LIKE @email COLLATE NOCASE');
      values.email = `%${filters.email}%`;
    }
    if (filters.role) {
      clauses.push('role = @role');
      values.role = filters.role;
    }
    if (filters.active !== undefined) {
      clauses.push('active = @active');
      values.active = filters.active ? 1 : 0;
    }
    if (filters.q) {
      clauses.push('(name LIKE @q COLLATE NOCASE OR email LIKE @q COLLATE NOCASE)');
      values.q = `%${filters.q}%`;
    }

    return { sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', values };
  }

  async list(params: UserFilters & { page?: number; pageSize?: number } = {}): Promise<User[]> {
    const page = Math.max(1, Math.floor(Number(params.page ?? 1)));
    const pageSize = Math.min(100, Math.max(1, Math.floor(Number(params.pageSize ?? 10))));
    const offset = (page - 1) * pageSize;
    const where = this.buildWhere(params);
    const rows = this.database.prepare(`
      SELECT id, name, email, role, active, created_at, updated_at
      FROM users ${where.sql}
      ORDER BY created_at ASC, id ASC
      LIMIT @limit OFFSET @offset
    `).all({ ...where.values, limit: pageSize, offset }) as UserRow[];

    return rows.map(toUser);
  }

  async count(filters: UserFilters = {}): Promise<number> {
    const where = this.buildWhere(filters);
    const row = this.database.prepare(`SELECT COUNT(*) AS count FROM users ${where.sql}`).get(where.values) as { count: number };
    return row.count;
  }

  async getById(id: string): Promise<User | null> {
    const row = this.database.prepare(`
      SELECT id, name, email, role, active, created_at, updated_at FROM users WHERE id = ?
    `).get(id) as UserRow | undefined;
    return row ? toUser(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = this.database.prepare(`
      SELECT id, name, email, role, active, created_at, updated_at FROM users WHERE email = ? COLLATE NOCASE
    `).get(email) as UserRow | undefined;
    return row ? toUser(row) : null;
  }

  async create(user: User): Promise<User> {
    const insert = this.database.prepare(insertSql);
    const createUniqueUser = this.database.transaction((record: User) => {
      const duplicate = this.database.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE LIMIT 1').get(record.email);
      if (duplicate) {
        throw new UserConflictError(`El correo electrónico '${record.email}' ya está en uso.`);
      }
      insert.run({
        ...record,
        active: record.active ? 1 : 0,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt ?? null,
      });
      return record;
    });
    return createUniqueUser(user);
  }

  async createMany(users: User[]): Promise<number> {
    const insert = this.database.prepare(insertSql);
    // Una transacción hace que cada lote se guarde completo o no se guarde, sin dejar medias altas.
    const insertBatch = this.database.transaction((batch: User[]) => {
      for (const user of batch) {
        insert.run({
          ...user,
          active: user.active ? 1 : 0,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt ?? null,
        });
      }
      return batch.length;
    });

    try {
      return insertBatch(users);
    } catch (error) {
      throw error;
    }
  }

  async update(id: string, changes: Partial<User>): Promise<User> {
    const updateUniqueUser = this.database.transaction((userId: string, update: Partial<User>) => {
      const currentRow = this.database.prepare(`
        SELECT id, name, email, role, active, created_at, updated_at FROM users WHERE id = ?
      `).get(userId) as UserRow | undefined;
      if (!currentRow) {
        throw new UserNotFoundError(userId);
      }

      const current = toUser(currentRow);
      const updated: User = { ...current, ...update, updatedAt: new Date().toISOString() };
      const duplicate = this.database.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE AND id != ? LIMIT 1')
        .get(updated.email, userId);
      if (duplicate) {
        throw new UserConflictError(`El correo electrónico '${updated.email}' ya está en uso.`);
      }

      this.database.prepare(`
        UPDATE users SET name = @name, email = @email, role = @role, active = @active,
          created_at = @createdAt, updated_at = @updatedAt
        WHERE id = @id
      `).run({
        ...updated,
        active: updated.active ? 1 : 0,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt ?? null,
      });
      return updated;
    });
    return updateUniqueUser(id, changes);
  }

  async delete(id: string): Promise<void> {
    const result = this.database.prepare('DELETE FROM users WHERE id = ?').run(id);
    if (result.changes === 0) {
      throw new UserNotFoundError(id);
    }
  }

  async deleteAll(): Promise<number> {
    return this.database.prepare('DELETE FROM users').run().changes;
  }

  async *streamAll(): AsyncIterable<User> {
    const batchSize = 250;
    let cursor: { createdAt: string; id: string } | undefined;

    // La clave compuesta evita recorrer offsets crecientes y conserva un orden estable entre lotes.
    while (true) {
      const rows = cursor
        ? this.database.prepare(`
            SELECT id, name, email, role, active, created_at, updated_at
            FROM users
            WHERE created_at > @createdAt OR (created_at = @createdAt AND id > @id)
            ORDER BY created_at ASC, id ASC LIMIT @limit
          `).all({ ...cursor, limit: batchSize }) as UserRow[]
        : this.database.prepare(`
            SELECT id, name, email, role, active, created_at, updated_at
            FROM users ORDER BY created_at ASC, id ASC LIMIT ?
          `).all(batchSize) as UserRow[];
      if (rows.length === 0) {
        return;
      }

      for (const row of rows) {
        yield toUser(row);
      }
      const lastRow = rows[rows.length - 1];
      cursor = { createdAt: lastRow.created_at, id: lastRow.id };
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
  }

  close(): void {
    this.database.close();
  }
}