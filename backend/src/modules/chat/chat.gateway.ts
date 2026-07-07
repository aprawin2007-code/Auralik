import {
  WebSocketGateway,
  SubscribeMessage,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, UseFilters, Logger } from '@nestjs/common';
import { WsJwtGuard } from '@/common/guards/ws-jwt.guard';
import { WsExceptionFilter } from '@/common/filters/ws-exception.filter';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { ModerationService } from '../moderation/moderation.service';

@WebSocketGateway({
  namespace: 'chat',
  cors: { origin: '*' },
})
@UseFilters(WsExceptionFilter)
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger('ChatGateway');

  constructor(
    private readonly chatService: ChatService,
    private readonly moderationService: ModerationService,
  ) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected to chat namespace: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from chat namespace: ${client.id}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(client: Socket, payload: { roomId: string }) {
    await client.join(payload.roomId);
    this.logger.log(`Socket ${client.id} joined chat room: ${payload.roomId}`);
    client.emit('roomJoined', { roomId: payload.roomId });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('sendMessage')
  async handleMessage(client: Socket, payload: SendMessageDto) {
    const senderId = client.data.user.userId;
    
    // Check if user is muted
    const isMuted = await this.moderationService.isUserMuted(senderId);
    if (isMuted) {
      throw new WsException('You are currently muted and cannot send messages.');
    }

    const msg = await this.chatService.saveMessage(
      payload.roomId,
      senderId,
      payload.content,
      payload.type || 'text',
      {
        fileUrl: payload.fileUrl,
        fileName: payload.fileName,
        fileSize: payload.fileSize,
      }
    );

    // Broadcast saved message to all participants in room
    this.server.to(payload.roomId).emit('messageReceived', msg);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing')
  async handleTyping(client: Socket, payload: { roomId: string; isTyping: boolean }) {
    const userId = client.data.user.userId;
    
    // Check if user is muted
    const isMuted = await this.moderationService.isUserMuted(userId);
    if (isMuted) {
      return; // Silently ignore typing events from muted users
    }

    // Broadcast peerTyping to other participant in the room
    client.to(payload.roomId).emit('peerTyping', {
      userId,
      isTyping: payload.isTyping,
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('markDelivered')
  async handleMarkDelivered(client: Socket, payload: { roomId: string; messageIds: string[] }) {
    const userId = client.data.user.userId;
    
    for (const messageId of payload.messageIds) {
      await this.chatService.updateMessageStatus(messageId, 'delivered');
    }

    client.to(payload.roomId).emit('messageStatusUpdated', {
      userId,
      messageIds: payload.messageIds,
      status: 'delivered',
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('markRead')
  async handleMarkRead(client: Socket, payload: { roomId: string; messageIds: string[] }) {
    const userId = client.data.user.userId;
    
    for (const messageId of payload.messageIds) {
      await this.chatService.updateMessageStatus(messageId, 'read');
    }

    client.to(payload.roomId).emit('messageStatusUpdated', {
      userId,
      messageIds: payload.messageIds,
      status: 'read',
    });
  }
}
