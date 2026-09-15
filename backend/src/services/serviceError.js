export class ServiceError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ServiceError'
    this.status = status
  }
}
