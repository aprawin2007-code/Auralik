import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { ReportUserDto } from './dto/report-user.dto';
import { BlockUserDto } from './dto/block-user.dto';
import { ModerateUserDto } from './dto/moderate-user.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { AdminGuard } from '@/common/guards/admin.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Moderation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('moderation')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  // ── USER ENDPOINTS ─────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Submit a report against another user with rate limiting and spam checks' })
  @Post('reports')
  @HttpCode(HttpStatus.CREATED)
  reportUser(@Req() req: any, @Body() dto: ReportUserDto) {
    return this.moderationService.reportUser(req.user.userId, dto);
  }

  @ApiOperation({ summary: 'Block another user' })
  @Post('blocks')
  @HttpCode(HttpStatus.OK)
  blockUser(@Req() req: any, @Body() dto: BlockUserDto) {
    return this.moderationService.blockUser(req.user.userId, dto.blockedUserId);
  }

  @ApiOperation({ summary: 'Unblock a user' })
  @Delete('blocks/:blockedUserId')
  @HttpCode(HttpStatus.OK)
  unblockUser(@Req() req: any, @Param('blockedUserId') blockedUserId: string) {
    return this.moderationService.unblockUser(req.user.userId, blockedUserId);
  }

  @ApiOperation({ summary: 'List all blocked users' })
  @Get('blocks')
  listBlockedUsers(@Req() req: any) {
    return this.moderationService.listBlockedUsers(req.user.userId);
  }

  // ── ADMIN ENDPOINTS (Guarded by AdminGuard) ────────────────────────────────

  @ApiOperation({ summary: 'Admin action to ban, unban, mute, or unmute a user' })
  @UseGuards(AdminGuard)
  @Post('admin/moderate')
  @HttpCode(HttpStatus.OK)
  moderateUser(@Req() req: any, @Body() dto: ModerateUserDto) {
    return this.moderationService.moderateUser(req.admin.id, dto);
  }

  @ApiOperation({ summary: 'Admin action to resolve or dismiss a user report' })
  @UseGuards(AdminGuard)
  @Post('admin/reports/:id/resolve')
  @HttpCode(HttpStatus.OK)
  resolveReport(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ResolveReportDto,
  ) {
    return this.moderationService.resolveReport(req.admin.id, id, dto);
  }

  @ApiOperation({ summary: 'Get report moderation queue (ordered by AI score / priority)' })
  @UseGuards(AdminGuard)
  @Get('admin/reports')
  getModerationQueue(@Query('status') status?: 'PENDING' | 'RESOLVED' | 'DISMISSED') {
    return this.moderationService.getModerationQueue(status);
  }

  @ApiOperation({ summary: 'Retrieve moderation audit logs' })
  @UseGuards(AdminGuard)
  @Get('admin/audit-logs')
  getAuditLogs() {
    return this.moderationService.getAuditLogs();
  }
}
