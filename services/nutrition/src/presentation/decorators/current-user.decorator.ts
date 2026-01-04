import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '@aki/shared';

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext): JwtPayload | string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (!user) {
      return undefined;
    }

    return data ? user[data] : user;
  },
);
