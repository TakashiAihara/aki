import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthEvent, AuthEventType } from '@domain/entities/auth-event.entity';
import { LoggerService } from '@infrastructure/logging/logger.service';

export interface AuthEventData {
  userId?: string;
  eventType: AuthEventType;
  ipAddress: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuthEventService {
  constructor(
    @InjectRepository(AuthEvent)
    private readonly authEventRepository: Repository<AuthEvent>,
    private readonly logger: LoggerService,
  ) {}

  async logEvent(data: AuthEventData): Promise<AuthEvent> {
    const event = this.authEventRepository.create({
      userId: data.userId,
      eventType: data.eventType,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      metadata: data.metadata,
    });

    const savedEvent = await this.authEventRepository.save(event);

    this.logger.log(
      `Auth event logged: ${data.eventType} for user ${data.userId || 'anonymous'}`,
      'AuthEventService',
    );

    return savedEvent;
  }

  async logLoginSuccess(
    userId: string,
    ipAddress: string,
    userAgent?: string,
    provider?: string,
  ): Promise<AuthEvent> {
    return this.logEvent({
      userId,
      eventType: AuthEventType.LOGIN_SUCCESS,
      ipAddress,
      userAgent,
      metadata: provider ? { provider } : undefined,
    });
  }

  async logLoginFailure(
    ipAddress: string,
    userAgent?: string,
    reason?: string,
    attemptedEmail?: string,
  ): Promise<AuthEvent> {
    return this.logEvent({
      eventType: AuthEventType.LOGIN_FAILURE,
      ipAddress,
      userAgent,
      metadata: { reason, attemptedEmail },
    });
  }

  async logTokenRefresh(
    userId: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<AuthEvent> {
    return this.logEvent({
      userId,
      eventType: AuthEventType.TOKEN_REFRESH,
      ipAddress,
      userAgent,
    });
  }

  async logTokenRevocation(
    userId: string,
    ipAddress: string,
    userAgent?: string,
    reason?: string,
  ): Promise<AuthEvent> {
    return this.logEvent({
      userId,
      eventType: AuthEventType.TOKEN_REVOKED,
      ipAddress,
      userAgent,
      metadata: reason ? { reason } : undefined,
    });
  }

  async logLogout(
    userId: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<AuthEvent> {
    return this.logEvent({
      userId,
      eventType: AuthEventType.LOGOUT,
      ipAddress,
      userAgent,
    });
  }

  async logAccountDeletionRequested(
    userId: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<AuthEvent> {
    return this.logEvent({
      userId,
      eventType: AuthEventType.ACCOUNT_DELETION_REQUESTED,
      ipAddress,
      userAgent,
    });
  }

  async logAccountDeletionCancelled(
    userId: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<AuthEvent> {
    return this.logEvent({
      userId,
      eventType: AuthEventType.ACCOUNT_DELETION_CANCELLED,
      ipAddress,
      userAgent,
    });
  }

  async logAccountDeleted(
    userId: string,
    ipAddress: string,
  ): Promise<AuthEvent> {
    return this.logEvent({
      userId,
      eventType: AuthEventType.ACCOUNT_DELETED,
      ipAddress,
    });
  }

  async logOAuthLinked(
    userId: string,
    ipAddress: string,
    provider: string,
    userAgent?: string,
  ): Promise<AuthEvent> {
    return this.logEvent({
      userId,
      eventType: AuthEventType.OAUTH_LINKED,
      ipAddress,
      userAgent,
      metadata: { provider },
    });
  }

  async logOAuthUnlinked(
    userId: string,
    ipAddress: string,
    provider: string,
    userAgent?: string,
  ): Promise<AuthEvent> {
    return this.logEvent({
      userId,
      eventType: AuthEventType.OAUTH_UNLINKED,
      ipAddress,
      userAgent,
      metadata: { provider },
    });
  }

  async getRecentEvents(
    userId: string,
    limit: number = 20,
  ): Promise<AuthEvent[]> {
    return this.authEventRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getEventsByType(
    eventType: AuthEventType,
    limit: number = 100,
  ): Promise<AuthEvent[]> {
    return this.authEventRepository.find({
      where: { eventType },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getFailedLoginAttempts(
    ipAddress: string,
    sinceMinutes: number = 15,
  ): Promise<number> {
    const since = new Date(Date.now() - sinceMinutes * 60 * 1000);

    const count = await this.authEventRepository.count({
      where: {
        eventType: AuthEventType.LOGIN_FAILURE,
        ipAddress,
        createdAt: new Date(since.toISOString()),
      },
    });

    return count;
  }
}
