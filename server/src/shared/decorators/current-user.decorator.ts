import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    console.log('[CurrentUser] Full user object:', user);
    console.log('[CurrentUser] Requested property:', data);

    // If a specific property is requested (e.g., @CurrentUser('id'))
    if (data && user) {
      const value = user[data];
      console.log(`[CurrentUser] Returning user.${data}:`, value);
      return value;
    }

    // Otherwise return the whole user object
    console.log('[CurrentUser] Returning whole user object');
    return user;
  },
);