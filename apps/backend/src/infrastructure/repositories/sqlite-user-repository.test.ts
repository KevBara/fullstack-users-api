import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';

import { seedUsers } from './seed-users';
import { SqliteUserRepository } from './sqlite-user-repository';
import { generateUsersUseCase } from '../../application/use-cases/generate-users-use-case';

const temporaryDirectories: string[] = [];
const repositories: SqliteUserRepository[] = [];

function createRepository(): SqliteUserRepository {
  const directory = mkdtempSync(join(tmpdir(), 'users-sqlite-test-'));
  temporaryDirectories.push(directory);
  const repository = new SqliteUserRepository(join(directory, 'users.sqlite'));
  repositories.push(repository);
  return repository;
}

afterEach(() => {
  repositories.splice(0).forEach((repository) => repository.close());
  temporaryDirectories.splice(0).forEach((directory) => rmSync(directory, { recursive: true, force: true }));
});

describe('SqliteUserRepository', () => {
  it('migrates an existing unique-email schema without losing rows', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'users-sqlite-migration-'));
    temporaryDirectories.push(directory);
    const path = join(directory, 'users.sqlite');
    const legacyDatabase = new Database(path);
    legacyDatabase.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL COLLATE NOCASE UNIQUE,
        role TEXT NOT NULL CHECK (role IN ('admin', 'user', 'manager')),
        active INTEGER NOT NULL CHECK (active IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT
      );
      INSERT INTO users VALUES ('legacy-1', 'Legacy User', 'legacy@example.test', 'user', 1, '2024-01-01T00:00:00.000Z', NULL);
    `);
    legacyDatabase.close();

    const repository = new SqliteUserRepository(path);
    repositories.push(repository);
    await repository.createMany([
      { ...seedUsers[0], id: 'generated-1', email: 'repeat@example.test' },
      { ...seedUsers[1], id: 'generated-2', email: 'repeat@example.test' },
    ]);

    expect(await repository.count()).toBe(3);
    expect(await repository.getById('legacy-1')).toMatchObject({ name: 'Legacy User' });
  });

  it('persists records across repository instances and seeds only an empty database', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'users-sqlite-persistence-'));
    const path = join(directory, 'users.sqlite');
    temporaryDirectories.push(directory);
    const firstRepository = new SqliteUserRepository(path);
    repositories.push(firstRepository);
    await firstRepository.seedIfEmpty();
    expect(await firstRepository.count()).toBe(seedUsers.length);
    firstRepository.close();
    repositories.splice(repositories.indexOf(firstRepository), 1);

    const reopened = new SqliteUserRepository(path);
    repositories.push(reopened);
    await reopened.seedIfEmpty();
    expect(await reopened.count()).toBe(seedUsers.length);
    expect(await reopened.getById('user-2')).toMatchObject({ email: 'bob@example.com' });
  });

  it('does not re-seed records after an explicit clear and restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'users-sqlite-clear-'));
    temporaryDirectories.push(directory);
    const path = join(directory, 'users.sqlite');
    const first = new SqliteUserRepository(path);
    repositories.push(first);
    await first.seedIfEmpty();
    await first.deleteAll();
    first.close();
    repositories.splice(repositories.indexOf(first), 1);

    const reopened = new SqliteUserRepository(path);
    repositories.push(reopened);
    await reopened.seedIfEmpty();
    expect(await reopened.count()).toBe(0);
  });

  it('applies SQL filters before pagination and reports the filtered total', async () => {
    const repository = createRepository();
    await repository.createMany(seedUsers);

    expect(await repository.count({ role: 'user', active: false })).toBe(1);
    expect(await repository.list({ q: 'ALI', page: 1, pageSize: 10 })).toMatchObject([
      { id: 'user-1', name: 'Alice' },
    ]);
  });

  it('clears all records and enforces unique emails case-insensitively', async () => {
    const repository = createRepository();
    await repository.createMany(seedUsers);
    await expect(repository.create({ ...seedUsers[0], id: 'duplicate', email: 'ALICE@example.com' }))
      .rejects.toThrow('ya está en uso');

    expect(await repository.deleteAll()).toBe(3);
    expect(await repository.count()).toBe(0);
  });

  it('generates and streams 5,000 users using the SQLite adapter', async () => {
    const repository = createRepository();
    const generated = await generateUsersUseCase(repository);
    const repeatedEmailCount = await repository.count({ email: 'sofia.garcia@example.test' });
    let streamed = 0;

    for await (const _user of repository.streamAll()) {
      streamed += 1;
    }

    expect(generated).toBe(5_000);
    expect(await repository.count()).toBe(5_000);
    expect(repeatedEmailCount).toBeGreaterThan(1);
    expect(streamed).toBe(5_000);
  });
});