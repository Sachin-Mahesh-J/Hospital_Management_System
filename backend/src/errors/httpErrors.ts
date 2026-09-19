import { AppError, type ErrorField } from './AppError.js'

export class ValidationError extends AppError {
  constructor(message = 'The request is invalid.', fields?: readonly ErrorField[]) {
    super(400, 'VALIDATION_ERROR', message, fields)
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication is required.') {
    super(401, 'AUTHENTICATION_REQUIRED', message)
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'You are not authorized to perform this action.') {
    super(403, 'FORBIDDEN', message)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'The requested resource was not found.') {
    super(404, 'RESOURCE_NOT_FOUND', message)
  }
}

export class ConflictError extends AppError {
  constructor(message = 'The request conflicts with the current resource state.') {
    super(409, 'RESOURCE_CONFLICT', message)
  }
}
