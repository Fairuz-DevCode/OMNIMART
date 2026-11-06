export class AppError extends Error {
  public statusCode: number;
  public status: string;
  public errors: any;
  public isOperational: boolean;

  constructor(message: string, statusCode: number, errors: any = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.errors = errors;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}
