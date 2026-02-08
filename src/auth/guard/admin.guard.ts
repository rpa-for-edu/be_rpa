import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from 'src/users/entity/user.entity';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Since we added role to User entity, we can verify it here.
    // Note: request.user comes from JwtStrategy.validate(), check if it includes role.
    // If JwtStrategy returns the full user entity, it has 'role'.
    // If it returns a subset, we might need to adjust JwtStrategy or fetch user.
    
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can access this resource');
    }

    return true;
  }
}
