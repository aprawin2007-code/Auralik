import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { ReportUserDto } from './dto/report-user.dto';
import { ModerateUserDto, ModerationAction } from './dto/moderate-user.dto';
import { ResolveReportDto, ResolveAction } from './dto/resolve-report.dto';

@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // USER ACTIONS: REPORTING & SPAM/RATE LIMITING
  // ─────────────────────────────────────────────────────────────────────────────

  async reportUser(reporterId: string, dto: ReportUserDto) {
    if (reporterId === dto.reportedUserId) {
      throw new BadRequestException('You cannot report yourself');
    }

    const reportedUser = await this.prisma.anonymousUser.findUnique({
      where: { id: dto.reportedUserId },
    });
    if (!reportedUser) {
      throw new NotFoundException('Reported user not found');
    }

    // 1. Rate Limiting: Max 5 reports per minute per reporter
    const rateLimitKey = `rate:reports:${reporterId}`;
    const reportsCount = await this.redis.get(rateLimitKey);
    if (reportsCount && parseInt(reportsCount, 10) >= 5) {
      throw new HttpException(
        'Too many reports. Please wait before submitting more reports.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 2. Spam Protection: Cannot report the same user within 1 hour
    const duplicateKey = `spam:reports:${reporterId}:${dto.reportedUserId}`;
    const alreadyReported = await this.redis.get(duplicateKey);
    if (alreadyReported) {
      throw new BadRequestException('You have already reported this user recently.');
    }

    // 3. AI Moderation Check (Future integration placeholder)
    const aiAnalysis = await this.analyzeReportWithAI(dto.reason, dto.description);

    // Create report inside Database
    const report = await this.prisma.report.create({
      data: {
        reporterId,
        reportedId: dto.reportedUserId,
        reason: dto.reason,
        description: dto.description,
        status: 'PENDING',
        aiScore: aiAnalysis.score,
        aiFlagged: aiAnalysis.flagged,
        aiMetadata: aiAnalysis.metadata || {},
      },
    });

    // Increment rate limits & set duplicate block
    if (reportsCount) {
      const current = parseInt(reportsCount, 10);
      await this.redis.set(rateLimitKey, (current + 1).toString(), 60);
    } else {
      await this.redis.set(rateLimitKey, '1', 60);
    }
    // Block duplicate reports for 1 hour (3600 seconds)
    await this.redis.set(duplicateKey, '1', 3600);

    return report;
  }

  /**
   * Stub/Mock for future AI Moderation services (e.g. Perspective API, OpenAI Moderation, etc.)
   */
  private async analyzeReportWithAI(reason: string, description?: string) {
    // In a real environment, this method would invoke an external AI moderation API
    const textToAnalyze = `${reason} ${description || ''}`.toLowerCase();
    
    let score = 0.15;
    let flagged = false;
    const metadata: any = { categories: {} };

    // Simple rule-based mock for testing/demonstration
    const toxicKeywords = ['harass', 'slur', 'threat', 'abuse', 'cheat', 'hack', 'fuck', 'hate'];
    const matchingKeywords = toxicKeywords.filter(keyword => textToAnalyze.includes(keyword));
    
    if (matchingKeywords.length > 0) {
      score = Math.min(0.5 + 0.1 * matchingKeywords.length, 0.99);
      flagged = score > 0.6;
      metadata.categories.toxicity = true;
      metadata.flaggedKeywords = matchingKeywords;
    } else {
      metadata.categories.toxicity = false;
    }

    return { score, flagged, metadata };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // USER ACTIONS: BLOCKING
  // ─────────────────────────────────────────────────────────────────────────────

  async blockUser(blockerId: string, blockedUserId: string) {
    if (blockerId === blockedUserId) {
      throw new BadRequestException('You cannot block yourself');
    }

    const targetUser = await this.prisma.anonymousUser.findUnique({
      where: { id: blockedUserId },
    });
    if (!targetUser) {
      throw new NotFoundException('User to block not found');
    }

    // Upsert the block
    const block = await this.prisma.blockedUser.upsert({
      where: {
        blockerId_blockedId: { blockerId, blockedId: blockedUserId },
      },
      create: { blockerId, blockedId: blockedUserId },
      update: {},
    });

    // 1. Break active match/session if they are in a call together
    const activeMatch = await this.prisma.activeMatch.findFirst({
      where: {
        OR: [
          { user1Id: blockerId, user2Id: blockedUserId, status: 'ACTIVE' },
          { user1Id: blockedUserId, user2Id: blockerId, status: 'ACTIVE' },
        ],
      },
    });

    if (activeMatch) {
      await this.prisma.activeMatch.update({
        where: { id: activeMatch.id },
        data: { status: 'ENDED', endedAt: new Date() },
      });

      // Update both back to online
      await this.prisma.anonymousUser.updateMany({
        where: { id: { in: [blockerId, blockedUserId] } },
        data: { status: 'ONLINE' },
      });
      
      // Notify matchmaking/rooms services or gateways to close websocket rooms
      await this.redis.publish('match:disconnect', JSON.stringify({ matchId: activeMatch.id }));
    }

    // 2. Remove friendship if it exists
    await this.prisma.friend.deleteMany({
      where: {
        OR: [
          { userId: blockerId, friendId: blockedUserId },
          { userId: blockedUserId, friendId: blockerId },
        ],
      },
    });

    return block;
  }

  async unblockUser(blockerId: string, blockedUserId: string) {
    try {
      await this.prisma.blockedUser.delete({
        where: {
          blockerId_blockedId: { blockerId, blockedId: blockedUserId },
        },
      });
      return { unblocked: true };
    } catch (e) {
      throw new NotFoundException('Block record not found');
    }
  }

  async listBlockedUsers(blockerId: string) {
    return this.prisma.blockedUser.findMany({
      where: { blockerId },
      include: {
        blocked: {
          select: { id: true, nickname: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ADMIN ACTIONS: MUTE, BAN, RESOLVE REPORTS
  // ─────────────────────────────────────────────────────────────────────────────

  async moderateUser(adminId: string, dto: ModerateUserDto) {
    const user = await this.prisma.anonymousUser.findUnique({
      where: { id: dto.targetUserId },
    });
    if (!user) {
      throw new NotFoundException('Target user not found');
    }

    const now = new Date();
    let untilDate: Date | null = null;
    if (dto.durationMinutes && dto.durationMinutes > 0) {
      untilDate = new Date(now.getTime() + dto.durationMinutes * 60 * 1000);
    }

    const auditActionMap = {
      [ModerationAction.BAN]: 'USER_BAN',
      [ModerationAction.UNBAN]: 'USER_UNBAN',
      [ModerationAction.MUTE]: 'USER_MUTE',
      [ModerationAction.UNMUTE]: 'USER_UNMUTE',
    };

    await this.prisma.$transaction(async (tx) => {
      // 1. Update user record based on the action
      if (dto.action === ModerationAction.BAN) {
        await tx.anonymousUser.update({
          where: { id: dto.targetUserId },
          data: {
            isBanned: true,
            bannedUntil: untilDate,
            banReason: dto.reason,
            status: 'OFFLINE',
          },
        });

        // Revoke active sessions in DB
        const userSessions = await tx.session.findMany({
          where: { userId: dto.targetUserId },
        });
        
        // Push tokens to Redis blocklist so the user is instantly kicked out
        for (const session of userSessions) {
          const ttl = Math.max(
            Math.ceil((session.expiresAt.getTime() - Date.now()) / 1000),
            60,
          );
          await this.redis.set(`blocklist:${session.token}`, 'banned', ttl);
        }

        await tx.session.deleteMany({
          where: { userId: dto.targetUserId },
        });

        // Set ban key in Redis
        const banTtl = dto.durationMinutes && dto.durationMinutes > 0
          ? dto.durationMinutes * 60
          : 365 * 24 * 60 * 60; // 1 year for perm ban
        await this.redis.set(`ban:${dto.targetUserId}`, dto.reason, banTtl);

      } else if (dto.action === ModerationAction.UNBAN) {
        await tx.anonymousUser.update({
          where: { id: dto.targetUserId },
          data: {
            isBanned: false,
            bannedUntil: null,
            banReason: null,
          },
        });
        await this.redis.del(`ban:${dto.targetUserId}`);

      } else if (dto.action === ModerationAction.MUTE) {
        await tx.anonymousUser.update({
          where: { id: dto.targetUserId },
          data: {
            isMuted: true,
            mutedUntil: untilDate,
            muteReason: dto.reason,
          },
        });

        // Set mute key in Redis for quick access inside messaging/signaling
        const muteTtl = dto.durationMinutes && dto.durationMinutes > 0
          ? dto.durationMinutes * 60
          : 365 * 24 * 60 * 60;
        await this.redis.set(`mute:${dto.targetUserId}`, dto.reason, muteTtl);

      } else if (dto.action === ModerationAction.UNMUTE) {
        await tx.anonymousUser.update({
          where: { id: dto.targetUserId },
          data: {
            isMuted: false,
            mutedUntil: null,
            muteReason: null,
          },
        });
        await this.redis.del(`mute:${dto.targetUserId}`);
      }

      // 2. Write to Audit Log
      await tx.auditLog.create({
        data: {
          adminId,
          action: auditActionMap[dto.action] as any,
          targetId: dto.targetUserId,
          targetType: 'USER',
          reason: dto.reason,
        },
      });
    });

    return { success: true, action: dto.action, until: untilDate };
  }

  async resolveReport(adminId: string, reportId: string, dto: ResolveReportDto) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });
    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const updatedReport = await this.prisma.report.update({
      where: { id: reportId },
      data: { status: dto.action },
    });

    const auditAction = dto.action === ResolveAction.RESOLVE ? 'REPORT_RESOLVE' : 'REPORT_DISMISS';

    await this.prisma.auditLog.create({
      data: {
        adminId,
        action: auditAction as any,
        targetId: reportId,
        targetType: 'REPORT',
        reason: dto.notes,
      },
    });

    return updatedReport;
  }

  async getModerationQueue(status: 'PENDING' | 'RESOLVED' | 'DISMISSED' = 'PENDING') {
    return this.prisma.report.findMany({
      where: { status },
      include: {
        reporter: { select: { id: true, nickname: true } },
        reported: { select: { id: true, nickname: true, isBanned: true, isMuted: true } },
      },
      // Order by high AI toxicity score first (AI assisted prioritization) then creation date
      orderBy: [
        { aiScore: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async getAuditLogs() {
    return this.prisma.auditLog.findMany({
      include: {
        admin: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Helper method for guards / gatewards to check if muted
  async isUserMuted(userId: string): Promise<boolean> {
    const isMutedRedis = await this.redis.get(`mute:${userId}`);
    if (isMutedRedis) return true;

    const user = await this.prisma.anonymousUser.findUnique({
      where: { id: userId },
      select: { isMuted: true, mutedUntil: true },
    });

    if (user && user.isMuted) {
      if (!user.mutedUntil || user.mutedUntil > new Date()) {
        return true;
      } else {
        // Mute has expired, clean up status
        await this.prisma.anonymousUser.update({
          where: { id: userId },
          data: { isMuted: false, mutedUntil: null, muteReason: null },
        });
      }
    }
    return false;
  }
}
