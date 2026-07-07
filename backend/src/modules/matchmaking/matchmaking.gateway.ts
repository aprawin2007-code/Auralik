import {
  WebSocketGateway,
  SubscribeMessage,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, UseFilters, Logger } from '@nestjs/common';
import { WsJwtGuard } from '@/common/guards/ws-jwt.guard';
import { WsExceptionFilter } from '@/common/filters/ws-exception.filter';
import { MatchmakingService } from './matchmaking.service';
import { MatchRequestDto } from './dto/match-request.dto';
import { RoomsService } from '../rooms/rooms.service';

@WebSocketGateway({
  namespace: 'matchmaking',
  cors: { origin: '*' },
})
@UseFilters(WsExceptionFilter)
export class MatchmakingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger('MatchmakingGateway');

  constructor(
    private readonly matchmakingService: MatchmakingService,
    private readonly roomsService: RoomsService,
  ) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected to matchmaking namespace: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from matchmaking namespace: ${client.id}`);
    const userId = client.data.user?.userId;
    if (userId) {
      await this.matchmakingService.removeUserFromQueue(userId);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinQueue')
  async handleJoinQueue(client: Socket, payload: MatchRequestDto) {
    const userId = client.data.user.userId;
    
    await this.matchmakingService.addUserToQueue({
      userId,
      socketId: client.id,
      joinedAt: Date.now(),
      interests: payload.interests || [],
      language: payload.languageCode,
      country: payload.countryCode,
    });

    client.emit('queueJoined', { success: true });

    // Instantly check for matches
    const match = await this.matchmakingService.findMatch(userId);
    if (match) {
      const room = await this.roomsService.createRoom(userId, match.matchedUser.userId);
      
      // Notify both sockets that match is found
      this.server.to(client.id).emit('matchFound', {
        roomId: room.id,
        opponentId: match.matchedUser.userId,
      });

      this.server.to(match.matchedUser.socketId).emit('matchFound', {
        roomId: room.id,
        opponentId: userId,
      });
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leaveQueue')
  async handleLeaveQueue(client: Socket) {
    const userId = client.data.user.userId;
    await this.matchmakingService.removeUserFromQueue(userId);
    client.emit('queueLeft', { success: true });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('skipMatch')
  async handleSkipMatch(client: Socket, payload: { roomId: string; opponentId: string }) {
    const userId = client.data.user.userId;

    this.logger.log(`User ${userId} requested to skip match ${payload.roomId}`);

    try {
      // 1. End active room match
      await this.roomsService.endRoom(payload.roomId);
    } catch (err) {
      this.logger.warn(`Room ${payload.roomId} already closed or not found`);
    }

    // 2. Add opponent to recent match blocklist to prevent repeating matches
    await this.matchmakingService.addRecentMatch(userId, payload.opponentId);

    // Notify opponent socket that the room has ended so they can recover/re-queue
    this.server.to(payload.roomId).emit('matchEnded', { skippedBy: userId });

    // 3. Search using saved preferences
    const preferences = await this.matchmakingService.getPreferences(userId);
    const interests = preferences?.interests || [];
    const language = preferences?.language;
    const country = preferences?.country;

    // 4. Auto re-queue skipping user
    await this.matchmakingService.addUserToQueue({
      userId,
      socketId: client.id,
      joinedAt: Date.now(),
      interests,
      language,
      country,
    });

    client.emit('queueJoined', { success: true });

    // 5. Instantly search for the next available user
    const match = await this.matchmakingService.findMatch(userId);
    if (match) {
      const room = await this.roomsService.createRoom(userId, match.matchedUser.userId);
      
      this.server.to(client.id).emit('matchFound', {
        roomId: room.id,
        opponentId: match.matchedUser.userId,
      });

      this.server.to(match.matchedUser.socketId).emit('matchFound', {
        roomId: room.id,
        opponentId: userId,
      });
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('nextMatch')
  async handleNextMatch(client: Socket) {
    const userId = client.data.user.userId;
    this.logger.log(`User ${userId} requested instant next match search`);

    const preferences = await this.matchmakingService.getPreferences(userId);
    
    await this.matchmakingService.addUserToQueue({
      userId,
      socketId: client.id,
      joinedAt: Date.now(),
      interests: preferences?.interests || [],
      language: preferences?.language,
      country: preferences?.country,
    });

    client.emit('queueJoined', { success: true });

    const match = await this.matchmakingService.findMatch(userId);
    if (match) {
      const room = await this.roomsService.createRoom(userId, match.matchedUser.userId);
      
      this.server.to(client.id).emit('matchFound', {
        roomId: room.id,
        opponentId: match.matchedUser.userId,
      });

      this.server.to(match.matchedUser.socketId).emit('matchFound', {
        roomId: room.id,
        opponentId: userId,
      });
    }
  }
}
