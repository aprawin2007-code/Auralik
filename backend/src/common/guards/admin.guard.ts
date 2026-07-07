import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user || !user.userId) {
      throw new UnauthorizedException('Authentication required');
    }

    // Check if user is in Admin database table
    const admin = await this.prisma.admin.findUnique({
      where: { id: user.userId },
    });

    if (!admin) {
      throw new ForbiddenException('Admin privileges required');
    }

    // Attach admin context to the request
    request.admin = admin;
    return true;
  }
}
