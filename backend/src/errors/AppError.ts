export type ErrorField = {
  path: string
  message: string
}

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields?: readonly ErrorField[],
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'AppError'
  }
}
