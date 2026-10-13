import { createApp } from './app';
import { resolve } from 'node:path';
import { SqliteUserRepository } from './infrastructure/repositories/sqlite-user-repository';

const port = Number(process.env.PORT ?? 4000);
const databasePath = process.env.DATABASE_PATH ?? resolve(process.cwd(), 'data/users.sqlite');
const repository = new SqliteUserRepository(databasePath);
await repository.seedIfEmpty();
const app = createApp(repository);

const server = app.listen(port, () => {
  console.log(`Users API listening on http://localhost:${port}`);
  console.log(`SQLite database: ${databasePath}`);
});

const shutdown = () => {
  server.close(() => {
    repository.close();
    process.exit(0);
  });
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
