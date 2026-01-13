import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class LoggerService implements NestLoggerService {
  constructor(private readonly logger: PinoLogger) { }

  log(message: string, context?: string): void {
    if (context) {
      this.logger.info({ context }, message);
    } else {
      this.logger.info(message);
    }
  }

  error(message: string, trace?: string, context?: string): void {
    if (context || trace) {
      this.logger.error({ trace, context }, message);
    } else {
      this.logger.error(message);
    }
  }

  warn(message: string, context?: string): void {
    if (context) {
      this.logger.warn({ context }, message);
    } else {
      this.logger.warn(message);
    }
  }

  debug(message: string, context?: string): void {
    if (context) {
      this.logger.debug({ context }, message);
    } else {
      this.logger.debug(message);
    }
  }

  verbose(message: string, context?: string): void {
    if (context) {
      this.logger.trace({ context }, message);
    } else {
      this.logger.trace(message);
    }
  }

  // Structured auth event logging
  logAuthEvent(
    eventType: string,
    userId: string | null,
    metadata: Record<string, unknown>,
  ): void {
    this.logger.info(
      {
        eventType,
        userId: this.maskUserId(userId),
        ...metadata,
      },
      'Auth event',
    );
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
