export class AppError extends Error {
	public readonly isOperational = true;

	constructor(
		message: string,
		public statusCode: number,
		public code: string
	) {
		super(message);
		this.name = this.constructor.name;
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

export class NotFoundError extends AppError {
	constructor(message: string) {
		super(message, 404, 'NOT_FOUND');
	}
}

export class AuthError extends AppError {
	constructor(message: string) {
		super(message, 401, 'UNAUTHORIZED');
	}
}

export class ForbiddenError extends AppError {
	constructor(message: string) {
		super(message, 403, 'FORBIDDEN');
	}
}

export class ValidationError extends AppError {
	constructor(message: string, public fields?: Record<string, string>) {
		super(message, 422, 'VALIDATION_ERROR');
	}
}

export class ConflictError extends AppError {
	constructor(message: string) {
		super(message, 409, 'CONFLICT');
	}
}

export function isAppError(err: unknown): err is AppError {
	return err instanceof AppError;
}
