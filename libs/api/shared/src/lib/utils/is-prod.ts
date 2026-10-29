/** Определяет, запущено ли приложение в production-окружении. */
export const isProd = process.env['NODE_ENV'] === 'production';
