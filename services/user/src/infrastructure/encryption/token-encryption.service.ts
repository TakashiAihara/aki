/**
 * Token Encryption Service
 *
 * Provides AES-256-GCM encryption for sensitive tokens at rest.
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM recommended
const TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

@Injectable()
export class TokenEncryptionService {
  private readonly encryptionKey: Buffer;

  constructor(private readonly configService: ConfigService) {
    const keyBase64 = this.configService.get<string>('TOKEN_ENCRYPTION_KEY');

    if (!keyBase64) {
      // Generate a warning-level key for development
      console.warn(
        'TOKEN_ENCRYPTION_KEY not set. Using derived key from JWT_SECRET (not recommended for production)',
      );
      const jwtSecret = this.configService.get<string>('JWT_SECRET') || 'development-secret';
      this.encryptionKey = crypto.scryptSync(jwtSecret, 'token-encryption-salt', KEY_LENGTH);
    } else {
      this.encryptionKey = Buffer.from(keyBase64, 'base64');
      if (this.encryptionKey.length !== KEY_LENGTH) {
        throw new Error(`TOKEN_ENCRYPTION_KEY must be ${KEY_LENGTH} bytes (base64 encoded)`);
      }
    }
  }

  /**
   * Encrypt a token using AES-256-GCM
   * Returns: base64(iv + authTag + ciphertext)
   */
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv, {
      authTagLength: TAG_LENGTH,
    });

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    // Combine: iv + authTag + ciphertext
    const combined = Buffer.concat([iv, authTag, encrypted]);
    return combined.toString('base64');
  }

  /**
   * Decrypt a token encrypted with AES-256-GCM
   */
  decrypt(encryptedBase64: string): string {
    const combined = Buffer.from(encryptedBase64, 'base64');

    if (combined.length < IV_LENGTH + TAG_LENGTH) {
      throw new Error('Invalid encrypted data: too short');
    }

    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const ciphertext = combined.subarray(IV_LENGTH + TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv, {
      authTagLength: TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  /**
   * Generate a new encryption key (for setup/rotation)
   */
  static generateKey(): string {
    return crypto.randomBytes(KEY_LENGTH).toString('base64');
  }
}
