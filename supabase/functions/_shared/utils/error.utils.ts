export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication failed") {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Access denied") {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = "Rate limit exceeded") {
    super(message, 429);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string = "External service error") {
    super(`${service}: ${message}`, 502);
  }
}

export function handleDatabaseError(error: { message: string; code?: string }): AppError {
  if (error.code === "23505") {
    return new ValidationError("Duplicate entry");
  }
  if (error.code === "23503") {
    return new ValidationError("Foreign key constraint violation");
  }
  if (error.code === "23502") {
    return new ValidationError("Required field missing");
  }
  
  return new AppError(`Database error: ${error.message}`, 500);
}

export function isRateLimitError(error: unknown): boolean {
  return error instanceof Error && error.message === "RATE_LIMIT";
}
