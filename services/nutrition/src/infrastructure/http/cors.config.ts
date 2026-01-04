import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

const allowedOrigins: Record<string, string[]> = {
  development: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  test: ['http://localhost:3000', 'http://localhost:3002'],
  production: [
    'https://aki.app',
    'https://www.aki.app',
    'https://api.aki.app',
  ],
};

export function getCorsConfig(env: string): CorsOptions {
  const origins = allowedOrigins[env] || allowedOrigins.development;

  return {
    origin: (origin, callback) => {
      if (!origin || origins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
      'X-Correlation-ID',
    ],
    exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    credentials: true,
    maxAge: 86400,
  };
}
