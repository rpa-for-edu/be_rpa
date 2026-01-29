import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { OVERRIDE_GUARD_KEY } from 'src/common/decorators/override-guard.decorator';
import { IS_PUBLIC_KEY } from 'src/common/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const overrideGuard = this.reflector.getAllAndOverride<string>(OVERRIDE_GUARD_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (overrideGuard) {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
  getRequest(context: ExecutionContext) {
    // HTTP
    if (context.getType() === 'http') {
      return context.switchToHttp().getRequest();
    }

    // WS
    if (context.getType() === 'ws') {
      const client = context.switchToWs().getClient();
      return {
        headers: {
          authorization: client.handshake.auth?.token
            ? `Bearer ${client.handshake.auth.token}`
            : client.handshake.headers?.authorization,
        },
        user: client.data?.user,
      };
    }
  }
  handleRequest(err, user, info, context: ExecutionContext) {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }

    if (context.getType() === 'ws') {
      const client = context.switchToWs().getClient();
      client.data.user = user;
      client.data.userId = user.id;
    }

    return user;
  }
}
