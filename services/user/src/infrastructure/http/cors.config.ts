/**
 * CORS Configuration
 *
 * Configures Cross-Origin Resource Sharing for the user service.
 */

import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export function getCorsConfig(env: string): CorsOptions {
  // Production origins
  const productionOrigins = [
    'https://akimi.app',
    'https://www.akimi.app',
    'https://api.akimi.app',
  ];

  // Development origins
  const developmentOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:8080',
  ];

  const allowedOrigins =
    env === 'production' ? productionOrigins : [...productionOrigins, ...developmentOrigins];

  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
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
      'Accept',
      'Origin',
    ],
    exposedHeaders: ['X-Request-ID', 'X-Correlation-ID'],
    credentials: true,
    maxAge: 86400, // 24 hours
  };
}
