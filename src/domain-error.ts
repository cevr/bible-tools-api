export class DomainError extends Error {
  meta?: unknown;
  constructor({ message, meta }: { message?: string; meta?: any } = {}) {
    super(message);

    this.meta = meta;
  }
}
