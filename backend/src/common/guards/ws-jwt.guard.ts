import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@/redis/redis.service';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();
      const authHeader = client.handshake.headers.authorization || client.handshake.auth.token;

      if (!authHeader) {
        throw new WsException('Unauthorized connection attempt');
      }

      const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
      
      // 1. Check if token is in Redis blocklist (revoked or banned)
      const isBlocked = await this.redis.get(`blocklist:${token}`);
      if (isBlocked) {
        throw new WsException('Token is revoked');
      }

      const secret = this.configService.get<string>('jwt.secret');
      const payload = await this.jwtService.verifyAsync(token, { secret });

      // 2. Check if user is banned
      const isBanned = await this.redis.get(`ban:${payload.sub}`);
      if (isBanned) {
        throw new WsException('User is banned');
      }

      context.switchToWs().getClient().data.user = payload;
      return true;
    } catch (err) {
      throw new WsException('Unauthorized');
    }
  }
}
