import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../guards/jwt-auth.guard';

/**
 * Decorator to mark a route as public (no authentication required)
 * Use this on endpoints that should be accessible without a valid JWT token
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
