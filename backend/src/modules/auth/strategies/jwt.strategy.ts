import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '@/common/types/jwt-payload.type';
import { RedisService } from '@/redis/redis.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: JwtPayload) {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token claims');
    }

    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
      // 1. Check if token is in Redis blocklist
      const isBlocked = await this.redis.get(`blocklist:${token}`);
      if (isBlocked) {
        throw new UnauthorizedException('Token has been revoked');
      }
    }

    // 2. Check if user is banned
    const isBanned = await this.redis.get(`ban:${payload.sub}`);
    if (isBanned) {
      throw new UnauthorizedException('User is banned');
    }

    return { userId: payload.sub, nickname: payload.nickname };
  }
}
