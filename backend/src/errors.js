// Erro de regra de negócio. O código é traduzido para status HTTP no controller.
class AppError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

module.exports = { AppError };
