export class ConflictError extends Error {
  status = 409;
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class InsufficientStockError extends Error {
  status = 409;
  constructor(
    public medicineId: number,
    public shortfall: number,
  ) {
    super(`Insufficient stock for medicine ${medicineId}: short by ${shortfall}`);
    this.name = 'InsufficientStockError';
  }
}

export class NotFoundError extends Error {
  status = 404;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}
