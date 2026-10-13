import cors from 'cors';
import express, { Express, Request, RequestHandler, Response } from 'express';

import { createUser } from './application/use-cases/create-user-use-case';
import { listUsersUseCase } from './application/use-cases/list-users-use-case';
import type { UserRepository } from './domain/user-repository';
import { InMemoryUserRepository } from './infrastructure/repositories/in-memory-user-repository';
import {
  createDeleteUserController,
  createDeleteAllUsersController,
  createExportUsersController,
  createGenerateUsersController,
  createGetUserController,
  createListUsersController,
  createUpdateUserController,
  createUserController,
  errorHandler,
} from './infrastructure/http/user-controller';

export function createApp(repository: UserRepository = new InMemoryUserRepository()): Express {
  const app = express();
  const asyncRoute = (handler: RequestHandler): RequestHandler => (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  // La capa HTTP solo coordina la petición y delega el comportamiento real a los casos de uso.

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  app.get('/api/v1/users', asyncRoute(createListUsersController({ repository })));
  app.post('/api/v1/users/generate', asyncRoute(createGenerateUsersController({ repository })));
  app.delete('/api/v1/users', asyncRoute(createDeleteAllUsersController({ repository })));
  app.post(
    '/api/v1/users',
    asyncRoute(createUserController({
      createUser: (input: { name: string; email: string; role: 'admin' | 'user' | 'manager'; active?: boolean }) =>
        createUser(repository, input),
    })),
  );
  app.get('/api/v1/users/export', asyncRoute(createExportUsersController({ repository })));
  app.get('/api/v1/users/:id', asyncRoute(createGetUserController({ repository })));
  app.put('/api/v1/users/:id', asyncRoute(createUpdateUserController({ repository })));
  app.delete('/api/v1/users/:id', asyncRoute(createDeleteUserController({ repository })));

  app.use(errorHandler);

  return app;
}
