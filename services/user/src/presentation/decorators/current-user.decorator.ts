import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '@aki/shared';

/**
 * Decorator to extract the current authenticated user from the request
 * Usage: @CurrentUser() user: JwtPayload
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext): JwtPayload | string | number | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (!user) {
      return undefined;
    }

    return data ? user[data] : user;
  },
);
