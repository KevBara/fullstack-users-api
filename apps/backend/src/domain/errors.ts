export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

export class UserValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'UserValidationError';
  }
}

export class UserNotFoundError extends AppError {
  constructor(userId: string) {
    super(`No se encontró el usuario: ${userId}`, 404);
    this.name = 'UserNotFoundError';
  }
}

export class UserConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
    this.name = 'UserConflictError';
  }
}
