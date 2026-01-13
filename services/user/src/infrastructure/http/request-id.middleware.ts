/**
 * Request ID Middleware
 *
 * Adds a unique request ID to each request for distributed tracing.
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

const REQUEST_ID_HEADER = 'x-request-id';
const CORRELATION_ID_HEADER = 'x-correlation-id';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Use existing request ID or generate a new one
    const requestId =
      (req.headers[REQUEST_ID_HEADER] as string) ||
      this.generateRequestId();

    // Use existing correlation ID or fall back to request ID
    const correlationId =
      (req.headers[CORRELATION_ID_HEADER] as string) ||
      requestId;

    // Set on request object for access in handlers
    (req as any).requestId = requestId;
    (req as any).correlationId = correlationId;

    // Set response headers
    res.setHeader(REQUEST_ID_HEADER, requestId);
    res.setHeader(CORRELATION_ID_HEADER, correlationId);

    next();
  }

  private generateRequestId(): string {
    // Format: timestamp-random (e.g., 1704326400000-abc123def456)
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(6).toString('hex');
    return `${timestamp}-${random}`;
  }
}
