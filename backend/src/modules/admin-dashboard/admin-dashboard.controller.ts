import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminDashboardService } from './admin-dashboard.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { AdminGuard } from '@/common/guards/admin.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Admin Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin-dashboard')
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @ApiOperation({ summary: 'Get overview count statistics (online users, active calls, queues, reports)' })
  @Get('overview')
  getOverview() {
    return this.dashboardService.getOverview();
  }

  @ApiOperation({ summary: 'List all active calls/matches with participant details' })
  @Get('active-matches')
  getActiveMatches() {
    return this.dashboardService.getActiveMatches();
  }

  @ApiOperation({ summary: 'Get matchmaking queue load breakdown by country' })
  @Get('queue-stats')
  getQueueStats() {
    return this.dashboardService.getQueueStats();
  }

  @ApiOperation({ summary: 'Get report metrics categorized by resolution state' })
  @Get('reports-summary')
  getReportsSummary() {
    return this.dashboardService.getReportsSummary();
  }

  @ApiOperation({ summary: 'Get statistics on blocked users and top reported users' })
  @Get('blocked-users-stats')
  getBlockedUsersStats() {
    return this.dashboardService.getBlockedUsersStats();
  }

  @ApiOperation({ summary: 'List all banned users' })
  @Get('banned-users')
  getBannedUsers() {
    return this.dashboardService.getBannedUsers();
  }

  @ApiOperation({ summary: 'Get active session totals and average counts per user' })
  @Get('session-analytics')
  getSessionAnalytics() {
    return this.dashboardService.getSessionAnalytics();
  }

  @ApiOperation({ summary: 'Get matchmaking pairing volume and average call duration' })
  @Get('matchmaking-metrics')
  getMatchmakingMetrics() {
    return this.dashboardService.getMatchmakingMetrics();
  }

  @ApiOperation({ summary: 'Get friend request count breakdowns and acceptance rates' })
  @Get('friend-request-metrics')
  getFriendRequestMetrics() {
    return this.dashboardService.getFriendRequestMetrics();
  }

  @ApiOperation({ summary: 'Get deep OS system load, memory logs, and database/Redis ping status' })
  @Get('server-health')
  getServerHealth() {
    return this.dashboardService.getServerHealth();
  }

  @ApiOperation({ summary: 'Get the last 200 lines of console stdout/stderr application logs' })
  @Get('logs')
  getLogs() {
    return this.dashboardService.getLogs();
  }
}
