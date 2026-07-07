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
import { RedisService } from '@/redis/redis.service';

@WebSocketGateway({
  namespace: 'signaling',
  cors: { origin: '*' },
})
@UseFilters(WsExceptionFilter)
export class SignalingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger('SignalingGateway');

  constructor(private readonly redis: RedisService) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected to signaling: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from signaling: ${client.id}`);
    const userId = client.data.user?.userId;
    const roomId = client.data.roomId;

    if (userId) {
      await this.redis.del(`signaling:socket:${userId}`);
    }

    if (roomId && userId) {
      // Notify the remaining participant about peer disconnect for auto-recovery/reconnect
      this.server.to(roomId).emit('peerDisconnected', { userId });
      this.logger.log(`Notified room ${roomId} that user ${userId} disconnected`);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('registerSocket')
  async handleRegister(client: Socket) {
    const userId = client.data.user.userId;
    await this.redis.set(`signaling:socket:${userId}`, client.id, 3600);
    client.emit('socketRegistered', { success: true });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(client: Socket, payload: { roomId: string }) {
    const userId = client.data.user.userId;
    
    await client.join(payload.roomId);
    client.data.roomId = payload.roomId; // Keep track for disconnect handler

    this.logger.log(`User ${userId} joined signaling room: ${payload.roomId}`);

    // Broadcast userJoined to other participant
    client.to(payload.roomId).emit('userJoined', { userId });
    client.emit('roomJoined', { roomId: payload.roomId });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(client: Socket, payload: { roomId: string }) {
    const userId = client.data.user.userId;
    
    await client.leave(payload.roomId);
    delete client.data.roomId;

    this.logger.log(`User ${userId} left signaling room: ${payload.roomId}`);

    client.to(payload.roomId).emit('userLeft', { userId });
    client.emit('roomLeft', { roomId: payload.roomId });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('offer')
  async handleOffer(client: Socket, payload: { roomId: string; offer: any; to: string }) {
    const fromUserId = client.data.user.userId;
    
    // Relay offer directly to peer inside room
    client.to(payload.roomId).emit('offer', {
      from: fromUserId,
      offer: payload.offer,
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('answer')
  async handleAnswer(client: Socket, payload: { roomId: string; answer: any; to: string }) {
    const fromUserId = client.data.user.userId;
    
    // Relay answer directly to peer inside room
    client.to(payload.roomId).emit('answer', {
      from: fromUserId,
      answer: payload.answer,
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('iceCandidate')
  async handleIceCandidate(client: Socket, payload: { roomId: string; candidate: any; to: string }) {
    const fromUserId = client.data.user.userId;
    
    // Relay ICE candidate directly to peer inside room
    client.to(payload.roomId).emit('iceCandidate', {
      from: fromUserId,
      candidate: payload.candidate,
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('connectionState')
  async handleConnectionState(client: Socket, payload: { roomId: string; state: string }) {
    const fromUserId = client.data.user.userId;
    client.to(payload.roomId).emit('peerConnectionState', {
      from: fromUserId,
      state: payload.state,
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('toggleCamera')
  async handleToggleCamera(client: Socket, payload: { roomId: string; enabled: boolean }) {
    const fromUserId = client.data.user.userId;
    client.to(payload.roomId).emit('peerCameraToggled', {
      from: fromUserId,
      enabled: payload.enabled,
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('toggleMicrophone')
  async handleToggleMicrophone(client: Socket, payload: { roomId: string; enabled: boolean }) {
    const fromUserId = client.data.user.userId;
    client.to(payload.roomId).emit('peerMicrophoneToggled', {
      from: fromUserId,
      enabled: payload.enabled,
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('toggleScreenShare')
  async handleToggleScreenShare(client: Socket, payload: { roomId: string; sharing: boolean }) {
    const fromUserId = client.data.user.userId;
    client.to(payload.roomId).emit('peerScreenShareToggled', {
      from: fromUserId,
      sharing: payload.sharing,
    });
  }
}
