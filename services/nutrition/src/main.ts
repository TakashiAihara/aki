import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { getCorsConfig } from './infrastructure/http/cors.config';
import { getHelmetConfig } from './infrastructure/http/helmet.config';
import { RequestIdMiddleware } from './infrastructure/http/request-id.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Security: Helmet middleware
  app.use(getHelmetConfig());

  // Security: CORS configuration
  const env = process.env.NODE_ENV || 'development';
  app.enableCors(getCorsConfig(env));

  // Request ID middleware for distributed tracing
  const requestIdMiddleware = new RequestIdMiddleware();
  app.use(requestIdMiddleware.use.bind(requestIdMiddleware));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // API prefix
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'api-docs', 'api-docs/(.*)'],
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Akimi Nutrition API')
    .setDescription(
      'Household Inventory Management API. ' +
        'Provides CRUD operations for food and household items, ' +
        'category and storage location management, and offline sync support.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT access token from User Service',
      },
      'bearer',
    )
    .addTag('inventory', 'Inventory item management')
    .addTag('categories', 'Category reference data')
    .addTag('storage-locations', 'Storage location reference data')
    .addTag('sync', 'Offline synchronization')
    .addTag('health', 'Health check endpoints')
    .setContact('Akimi Team', 'https://akimi.app', 'support@akimi.app')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) =>
      `${controllerKey}_${methodKey}`,
  });
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT || 3002;
  await app.listen(port);

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                  Akimi Nutrition Service                      ║
╠═══════════════════════════════════════════════════════════════╣
║  Status:      Running                                         ║
║  Port:        ${String(port).padEnd(49)}║
║  Environment: ${env.padEnd(49)}║
║  API Docs:    http://localhost:${port}/api-docs${' '.repeat(Math.max(0, 26 - String(port).length))}║
║  Health:      http://localhost:${port}/health${' '.repeat(Math.max(0, 28 - String(port).length))}║
╚═══════════════════════════════════════════════════════════════╝
  `);
}

bootstrap().catch((err) => {
  console.error('Failed to start Nutrition Service:', err);
  process.exit(1);
});
