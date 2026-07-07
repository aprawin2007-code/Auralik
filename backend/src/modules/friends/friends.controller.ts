import {
  Controller,
  Post,
  Delete,
  Patch,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { FriendsService } from './friends.service';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { ToggleFavoriteDto } from './dto/toggle-favorite.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Friends')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  // ── Requests ────────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Send a friend request using the target\'s device ID' })
  @Post('requests')
  @HttpCode(HttpStatus.CREATED)
  sendRequest(@Req() req: any, @Body() dto: SendFriendRequestDto) {
    return this.friendsService.sendRequest(req.user.userId, dto);
  }

  @ApiOperation({ summary: 'Accept an incoming friend request' })
  @Post('requests/:id/accept')
  @HttpCode(HttpStatus.OK)
  acceptRequest(@Req() req: any, @Param('id') id: string) {
    return this.friendsService.acceptRequest(req.user.userId, id);
  }

  @ApiOperation({ summary: 'Reject an incoming friend request' })
  @Post('requests/:id/reject')
  @HttpCode(HttpStatus.OK)
  rejectRequest(@Req() req: any, @Param('id') id: string) {
    return this.friendsService.rejectRequest(req.user.userId, id);
  }

  @ApiOperation({ summary: 'Cancel a friend request you sent' })
  @Delete('requests/:id')
  @HttpCode(HttpStatus.OK)
  cancelRequest(@Req() req: any, @Param('id') id: string) {
    return this.friendsService.cancelRequest(req.user.userId, id);
  }

  @ApiOperation({ summary: 'List all pending requests sent to you' })
  @Get('requests/received')
  getPendingReceived(@Req() req: any) {
    return this.friendsService.getPendingReceived(req.user.userId);
  }

  @ApiOperation({ summary: 'List all pending requests you sent' })
  @Get('requests/sent')
  getPendingSent(@Req() req: any) {
    return this.friendsService.getPendingSent(req.user.userId);
  }

  // ── Friends ─────────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'List all accepted friends' })
  @Get()
  listFriends(@Req() req: any) {
    return this.friendsService.listFriends(req.user.userId);
  }

  @ApiOperation({ summary: 'List recently interacted friends (latest calls/messages)' })
  @Get('recent')
  recentFriends(@Req() req: any, @Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.friendsService.recentFriends(req.user.userId, parsedLimit);
  }

  @ApiOperation({ summary: 'List friends marked as favourites' })
  @Get('favorites')
  favoriteFriends(@Req() req: any) {
    return this.friendsService.favoriteFriends(req.user.userId);
  }

  @ApiOperation({ summary: 'Remove a friend by their user ID' })
  @Delete(':friendUserId')
  @HttpCode(HttpStatus.OK)
  removeFriend(@Req() req: any, @Param('friendUserId') friendUserId: string) {
    return this.friendsService.removeFriend(req.user.userId, friendUserId);
  }

  @ApiOperation({ summary: 'Toggle favourite status for a friend' })
  @Patch(':friendUserId/favorite')
  toggleFavorite(
    @Req() req: any,
    @Param('friendUserId') friendUserId: string,
    @Body() dto: ToggleFavoriteDto,
  ) {
    return this.friendsService.toggleFavorite(req.user.userId, friendUserId, dto.isFavorite);
  }
}
