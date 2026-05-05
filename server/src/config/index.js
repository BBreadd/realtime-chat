import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  dbPath: process.env.DB_PATH || './chat.db',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};

if (!config.jwtSecret) {
  console.error('FATAL: JWT_SECRET is not set. Aborting.');
  process.exit(1);
}
