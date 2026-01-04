import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger: winston.Logger;

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';

    this.logger = winston.createLogger({
      level: isProduction ? 'info' : 'debug',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
        winston.format.errors({ stack: true }),
        isProduction
          ? winston.format.json()
          : winston.format.combine(winston.format.colorize(), winston.format.simple()),
      ),
      defaultMeta: { service: 'user-service' },
      transports: [new winston.transports.Console()],
    });
  }

  log(message: string, context?: string): void {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string): void {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string): void {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string): void {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string): void {
    this.logger.verbose(message, { context });
  }

  // Structured auth event logging
  logAuthEvent(
    eventType: string,
    userId: string | null,
    metadata: Record<string, unknown>,
  ): void {
    this.logger.info('Auth event', {
      eventType,
      userId: this.maskUserId(userId),
      ...metadata,
    });
  }

  // Mask sensitive data for logs
  private maskUserId(userId: string | null): string | null {
    if (!userId) return null;
    return `${userId.substring(0, 8)}...`;
  }

  maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return '***';
    const maskedLocal = local.length > 2 ? `${local[0]}***${local[local.length - 1]}` : '***';
    return `${maskedLocal}@${domain}`;
  }
}
