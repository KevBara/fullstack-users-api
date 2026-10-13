import type { Request, Response } from 'express';

import { AppError, UserValidationError } from '../../domain/errors';
import { CreateUserInput, UpdateUserInput } from '../../domain/user';
import { createUser } from '../../application/use-cases/create-user-use-case';
import { deleteUserUseCase } from '../../application/use-cases/delete-user-use-case';
import { exportUsersStream } from '../../application/use-cases/export-users-use-case';
import { generateUsersUseCase } from '../../application/use-cases/generate-users-use-case';
import { getUserByIdUseCase } from '../../application/use-cases/get-user-by-id-use-case';
import { listUsersUseCase } from '../../application/use-cases/list-users-use-case';
import { updateUserUseCase } from '../../application/use-cases/update-user-use-case';
import type { UserRepository } from '../../domain/user-repository';

export function createUserController(deps: { createUser: (input: CreateUserInput) => Promise<any> }) {
  return async function controller(req: Request, res: Response): Promise<void> {
    const payload = req.body as CreateUserInput;
    const user = await deps.createUser(payload);

    res.status(201).json({
      data: user,
      message: 'Usuario creado correctamente',
    });
  };
}

export function createGenerateUsersController(deps: { repository: UserRepository }) {
  return async function controller(_req: Request, res: Response): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new AppError('La generación de datos de prueba está deshabilitada en producción.', 404);
    }

    const count = await generateUsersUseCase(deps.repository);
    const total = await deps.repository.count();
    res.status(201).json({
      count,
      total,
      message: `Se generaron ${count.toLocaleString('es-ES')} usuarios de prueba.`,
    });
  };
}

export function createDeleteAllUsersController(deps: { repository: UserRepository }) {
  return async function controller(_req: Request, res: Response): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new AppError('La limpieza de datos está deshabilitada en producción.', 404);
    }

    const deleted = await deps.repository.deleteAll();
    res.status(200).json({ deleted, message: `Se eliminaron ${deleted} registros.` });
  };
}

export function createListUsersController(deps: { repository: UserRepository }) {
  return async function controller(req: Request, res: Response): Promise<void> {
    const queryValue = (value: unknown): string | undefined => {
      if (Array.isArray(value)) {
        return typeof value[0] === 'string' ? value[0] : undefined;
      }
      return typeof value === 'string' ? value : undefined;
    };
    const activeValue = queryValue(req.query.active);
    if (activeValue !== undefined && activeValue !== 'true' && activeValue !== 'false') {
      throw new UserValidationError("El filtro 'active' debe ser 'true' o 'false'.");
    }

    const pageValue = queryValue(req.query.page);
    const pageSizeValue = queryValue(req.query.pageSize);
    const result = await listUsersUseCase(deps.repository, {
      page: pageValue === undefined ? undefined : Number(pageValue),
      pageSize: pageSizeValue === undefined ? undefined : Number(pageSizeValue),
      id: queryValue(req.query.id),
      name: queryValue(req.query.name),
      email: queryValue(req.query.email),
      role: queryValue(req.query.role),
      active: activeValue === undefined ? undefined : activeValue === 'true',
      q: queryValue(req.query.q),
    });

    res.status(200).json(result);
  };
}

export function createGetUserController(deps: { repository: UserRepository }) {
  return async function controller(req: Request, res: Response): Promise<void> {
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = await getUserByIdUseCase(deps.repository, userId);

    res.status(200).json({ data: user });
  };
}

export function createUpdateUserController(deps: { repository: UserRepository }) {
  return async function controller(req: Request, res: Response): Promise<void> {
    const payload = req.body as UpdateUserInput;
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = await updateUserUseCase(deps.repository, userId, payload);

    res.status(200).json({ data: user, message: 'Usuario actualizado correctamente' });
  };
}

export function createDeleteUserController(deps: { repository: UserRepository }) {
  return async function controller(req: Request, res: Response): Promise<void> {
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await deleteUserUseCase(deps.repository, userId);

    res.status(204).send();
  };
}

export function createExportUsersController(deps: { repository: UserRepository }) {
  return async function controller(_req: Request, res: Response): Promise<void> {
    const stream = exportUsersStream(deps.repository);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="users-export-${Date.now()}.csv"`);

    stream.pipe(res);
  };
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: (error?: unknown) => void): void {
  const statusCode = err instanceof AppError ? (err as AppError).statusCode : 500;
  const message = err instanceof Error ? err.message : 'Error inesperado';

  res.status(statusCode).json({
    error: message,
  });
}
