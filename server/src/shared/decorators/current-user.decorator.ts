import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // If a specific property is requested (e.g., @CurrentUser('id'))
    if (data && user) {
      return user[data];
    }

    // Otherwise return the whole user object
    return user;
  },
);