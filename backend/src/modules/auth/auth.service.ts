import { Injectable, UnauthorizedException, ForbiddenException, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { HashUtil } from '@/common/utils/hash.util';

@Injectable()
export class AuthService implements OnApplicationBootstrap, OnModuleDestroy {
  private cleanupInterval?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
  ) {}

  onApplicationBootstrap() {
    // Run session cleanup every 10 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanExpiredSessions().catch(err => console.error('Session cleanup error:', err));
    }, 10 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  async cleanExpiredSessions(): Promise<void> {
    const now = new Date();

    // Find all expired sessions
    const expiredSessions = await this.prisma.session.findMany({
      where: { expiresAt: { lt: now } },
      select: { userId: true },
    });

    if (expiredSessions.length === 0) return;

    const userIds = Array.from(new Set(expiredSessions.map(s => s.userId)));

    // Delete the expired sessions
    await this.prisma.session.deleteMany({
      where: { expiresAt: { lt: now } },
    });

    // Check remaining active sessions for these users
    for (const userId of userIds) {
      const activeCount = await this.prisma.session.count({
        where: { userId },
      });
      if (activeCount === 0) {
        // If no active sessions remain, mark user as OFFLINE
        await this.prisma.anonymousUser.update({
          where: { id: userId },
          data: { status: 'OFFLINE' },
        });
      }
    }
  }

  async startAnonymousSession(dto: CreateSessionDto): Promise<TokenResponseDto> {
    // 1. Find or create anonymous user based on deviceId
    let user = await this.prisma.anonymousUser.findUnique({
      where: { deviceId: dto.deviceId },
    });

    if (user) {
      // Check if user is banned
      if (user.isBanned) {
        if (!user.bannedUntil || user.bannedUntil > new Date()) {
          const reason = user.banReason ? `: ${user.banReason}` : '';
          const until = user.bannedUntil ? ` until ${user.bannedUntil.toISOString()}` : ' permanently';
          throw new ForbiddenException(`Your device has been banned${until}${reason}`);
        } else {
          // Ban has expired, clean up status
          await this.prisma.anonymousUser.update({
            where: { id: user.id },
            data: { isBanned: false, bannedUntil: null, banReason: null },
          });
        }
      }

      // Invalidate existing sessions for this user/device to prevent duplicate sessions
      const existingSessions = await this.prisma.session.findMany({
        where: { userId: user.id },
      });

      for (const s of existingSessions) {
        await this.redis.set(`blocklist:${s.token}`, 'revoked', 7 * 24 * 60 * 60);
      }

      await this.prisma.session.deleteMany({
        where: { userId: user.id },
      });

      // Update user status to ONLINE
      user = await this.prisma.anonymousUser.update({
        where: { id: user.id },
        data: {
          status: 'ONLINE',
          nickname: dto.nickname || user.nickname,
        },
      });
    } else {
      // Create new anonymous user
      user = await this.prisma.anonymousUser.create({
        data: {
          deviceId: dto.deviceId,
          nickname: dto.nickname || `Guest_${Math.floor(1000 + Math.random() * 9000)}`,
          status: 'ONLINE',
          preferences: {
            create: {},
          },
        },
      });
    }

    // Handle country linkage if present
    if (dto.countryCode) {
      const country = await this.prisma.country.findUnique({
        where: { code: dto.countryCode },
      });
      if (country) {
        await this.prisma.anonymousUser.update({
          where: { id: user.id },
          data: { countryId: country.id },
        });
      }
    }

    // Link interests if present
    if (dto.interests && dto.interests.length > 0) {
      const interestMatches = await this.prisma.interest.findMany({
        where: { name: { in: dto.interests } },
      });
      for (const item of interestMatches) {
        await this.prisma.anonymousUserInterest.create({
          data: {
            userId: user.id,
            interestId: item.id,
          },
        });
      }
    }

    // Link languages if present
    if (dto.languages && dto.languages.length > 0) {
      const languageMatches = await this.prisma.language.findMany({
        where: { code: { in: dto.languages } },
      });
      for (const item of languageMatches) {
        await this.prisma.anonymousUserLanguage.create({
          data: {
            userId: user.id,
            languageId: item.id,
          },
        });
      }
    }

    // Generate token set
    const tokens = await this.generateTokens(user.id, user.nickname || 'Guest');
    
    // Save session in database
    await this.prisma.session.create({
      data: {
        userId: user.id,
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days matching config default
      },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: 900, // 15m in seconds
      userId: user.id,
    };
  }

  async refreshSession(userId: string, refreshToken: string): Promise<TokenResponseDto> {
    // Check blocklist in Redis first
    const isBlocked = await this.redis.get(`blocklist:${refreshToken}`);
    if (isBlocked) {
      throw new UnauthorizedException('Token is revoked');
    }

    const session = await this.prisma.session.findUnique({
      where: { token: refreshToken },
    });

    if (!session || session.userId !== userId || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.anonymousUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    const tokens = await this.generateTokens(userId, user.nickname || 'Guest');

    // Update refresh token session mapping
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: 900,
      userId,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    // Add to Redis blocklist for its remaining lifetime (default 7 days limit)
    await this.redis.set(`blocklist:${refreshToken}`, 'revoked', 7 * 24 * 60 * 60);

    // Remove from DB
    await this.prisma.session.deleteMany({
      where: { token: refreshToken },
    });
  }

  async adminLogin(dto: AdminLoginDto): Promise<TokenResponseDto> {
    const admin = await this.prisma.admin.findUnique({
      where: { username: dto.username },
    });

    if (!admin || !HashUtil.verifyPassword(dto.password, admin.passwordHash)) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    const tokens = await this.generateTokens(admin.id, admin.username);

    // Save session in database
    await this.prisma.session.create({
      data: {
        userId: admin.id,
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: 900,
      userId: admin.id,
    };
  }

  private async generateTokens(userId: string, nickname: string): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: userId, nickname };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: this.configService.get<string>('jwt.expiresIn'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
