import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { LogBuffer } from '@/common/utils/log-buffer.util';
import * as os from 'os';

@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. OVERVIEW STATISTICS
  // ─────────────────────────────────────────────────────────────────────────────

  async getOverview() {
    const [onlineUserCount, activeMatchesCount, queueCount, reportsCount] = await Promise.all([
      this.prisma.anonymousUser.count({
        where: { status: { not: 'OFFLINE' } },
      }),
      this.prisma.activeMatch.count({
        where: { status: 'ACTIVE' },
      }),
      this.prisma.matchQueue.count(),
      this.prisma.report.count({
        where: { status: 'PENDING' },
      }),
    ]);

    return {
      onlineUserCount,
      activeMatchesCount,
      queueCount,
      reportsCount,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. ACTIVE MATCHES LISTING
  // ─────────────────────────────────────────────────────────────────────────────

  async getActiveMatches() {
    return this.prisma.activeMatch.findMany({
      where: { status: 'ACTIVE' },
      include: {
        user1: { select: { id: true, nickname: true, country: { select: { name: true } } } },
        user2: { select: { id: true, nickname: true, country: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. QUEUE STATISTICS
  // ─────────────────────────────────────────────────────────────────────────────

  async getQueueStats() {
    const totalInQueue = await this.prisma.matchQueue.count();

    // Group queue entries by country
    const queueByCountry = await this.prisma.matchQueue.findMany({
      include: {
        user: {
          select: {
            country: { select: { name: true, code: true } },
          },
        },
      },
    });

    const countryBreakdown: Record<string, number> = {};
    for (const entry of queueByCountry) {
      const countryName = entry.user.country?.name || 'Unknown';
      countryBreakdown[countryName] = (countryBreakdown[countryName] || 0) + 1;
    }

    return {
      totalInQueue,
      countryBreakdown,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. REPORTS SUMMARY
  // ─────────────────────────────────────────────────────────────────────────────

  async getReportsSummary() {
    const [pending, resolved, dismissed] = await Promise.all([
      this.prisma.report.count({ where: { status: 'PENDING' } }),
      this.prisma.report.count({ where: { status: 'RESOLVED' } }),
      this.prisma.report.count({ where: { status: 'DISMISSED' } }),
    ]);

    return {
      pending,
      resolved,
      dismissed,
      total: pending + resolved + dismissed,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. BLOCKED USERS METRICS
  // ─────────────────────────────────────────────────────────────────────────────

  async getBlockedUsersStats() {
    const totalBlocks = await this.prisma.blockedUser.count();
    
    // Top blocked users list
    const topBlocked = await this.prisma.report.groupBy({
      by: ['reportedId'],
      _count: {
        reportedId: true,
      },
      orderBy: {
        _count: {
          reportedId: 'desc',
        },
      },
      take: 5,
    });

    const topBlockedUsers = await Promise.all(
      topBlocked.map(async (item) => {
        const user = await this.prisma.anonymousUser.findUnique({
          where: { id: item.reportedId },
          select: { id: true, nickname: true },
        });
        return {
          user,
          reportCount: item._count.reportedId,
        };
      }),
    );

    return {
      totalBlocks,
      topBlockedUsers,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. BANNED USERS LISTING
  // ─────────────────────────────────────────────────────────────────────────────

  async getBannedUsers() {
    return this.prisma.anonymousUser.findMany({
      where: { isBanned: true },
      select: {
        id: true,
        nickname: true,
        deviceId: true,
        banReason: true,
        bannedUntil: true,
        createdAt: true,
      },
      orderBy: { bannedUntil: 'desc' },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. SESSION ANALYTICS
  // ─────────────────────────────────────────────────────────────────────────────

  async getSessionAnalytics() {
    const now = new Date();
    const [totalSessions, activeSessions, totalAnonymousUsers] = await Promise.all([
      this.prisma.session.count(),
      this.prisma.session.count({
        where: { expiresAt: { gt: now } },
      }),
      this.prisma.anonymousUser.count(),
    ]);

    const averageSessionsPerUser = totalAnonymousUsers > 0
      ? parseFloat((totalSessions / totalAnonymousUsers).toFixed(2))
      : 0;

    return {
      totalSessions,
      activeSessions,
      averageSessionsPerUser,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. MATCHMAKING METRICS
  // ─────────────────────────────────────────────────────────────────────────────

  async getMatchmakingMetrics() {
    const [totalMatches, endedMatchesCount] = await Promise.all([
      this.prisma.activeMatch.count(),
      this.prisma.activeMatch.count({
        where: { status: 'ENDED' },
      }),
    ]);

    // Query ended matches to calculate average duration in memory
    const endedMatches = await this.prisma.activeMatch.findMany({
      where: { status: 'ENDED', endedAt: { not: null } },
      select: { createdAt: true, endedAt: true },
      take: 200, // Limit to recent matches for speed
    });

    let totalDurationMs = 0;
    let validMatches = 0;

    for (const match of endedMatches) {
      if (match.endedAt) {
        totalDurationMs += match.endedAt.getTime() - match.createdAt.getTime();
        validMatches++;
      }
    }

    const averageDurationSeconds = validMatches > 0
      ? parseFloat((totalDurationMs / (validMatches * 1000)).toFixed(1))
      : 0;

    return {
      totalMatchesCreated: totalMatches,
      endedMatchesCount,
      averageDurationSeconds,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. FRIEND REQUEST METRICS
  // ─────────────────────────────────────────────────────────────────────────────

  async getFriendRequestMetrics() {
    const [totalRequests, accepted, pending, rejected] = await Promise.all([
      this.prisma.friendRequest.count(),
      this.prisma.friendRequest.count({ where: { status: 'ACCEPTED' } }),
      this.prisma.friendRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.friendRequest.count({ where: { status: 'REJECTED' } }),
    ]);

    const acceptRate = totalRequests > 0
      ? parseFloat(((accepted / totalRequests) * 100).toFixed(2))
      : 0;

    return {
      totalRequests,
      accepted,
      pending,
      rejected,
      acceptRatePercentage: acceptRate,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 10. SERVER HEALTH STATUS
  // ─────────────────────────────────────────────────────────────────────────────

  async getServerHealth() {
    let databaseStatus = 'healthy';
    let redisStatus = 'healthy';

    // Check database connectivity
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (e) {
      databaseStatus = 'unhealthy';
    }

    // Check Redis connectivity
    try {
      const pingRes = await this.redis.getClient().ping();
      if (pingRes !== 'PONG') redisStatus = 'unhealthy';
    } catch (e) {
      redisStatus = 'unhealthy';
    }

    const systemMemoryTotal = os.totalmem();
    const systemMemoryFree = os.freemem();
    const systemMemoryUsed = systemMemoryTotal - systemMemoryFree;
    const processMemory = process.memoryUsage();

    return {
      status: databaseStatus === 'healthy' && redisStatus === 'healthy' ? 'ok' : 'error',
      database: databaseStatus,
      redis: redisStatus,
      system: {
        platform: os.platform(),
        arch: os.arch(),
        uptimeSeconds: os.uptime(),
        loadAverage: os.loadavg(),
        cpusCount: os.cpus().length,
        memory: {
          totalBytes: systemMemoryTotal,
          freeBytes: systemMemoryFree,
          usedBytes: systemMemoryUsed,
          usagePercentage: parseFloat(((systemMemoryUsed / systemMemoryTotal) * 100).toFixed(2)),
        },
      },
      process: {
        uptimeSeconds: process.uptime(),
        memoryUsage: {
          rssBytes: processMemory.rss,
          heapTotalBytes: processMemory.heapTotal,
          heapUsedBytes: processMemory.heapUsed,
          externalBytes: processMemory.external,
        },
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 11. APPLICATION LOGS
  // ─────────────────────────────────────────────────────────────────────────────

  getLogs(): string[] {
    return LogBuffer.getLogs();
  }
}
