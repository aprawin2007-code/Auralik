import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';

@Injectable()
export class FriendsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // FRIEND REQUESTS
  // ─────────────────────────────────────────────────────────────────────────────

  async sendRequest(senderId: string, dto: SendFriendRequestDto) {
    // Resolve the target user by their public deviceId (preserves privacy)
    const target = await this.prisma.anonymousUser.findUnique({
      where: { deviceId: dto.targetDeviceId },
      select: { id: true, nickname: true },
    });

    if (!target) {
      throw new NotFoundException('Target user not found');
    }

    if (target.id === senderId) {
      throw new BadRequestException('You cannot send a friend request to yourself');
    }

    // Check for an existing bidirectional friend relationship
    const existingFriend = await this.prisma.friend.findFirst({
      where: {
        OR: [
          { userId: senderId, friendId: target.id },
          { userId: target.id, friendId: senderId },
        ],
      },
    });

    if (existingFriend) {
      throw new ConflictException('You are already friends with this user');
    }

    // Check if a pending request already exists in either direction
    const existingRequest = await this.prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId: target.id },
          { senderId: target.id, receiverId: senderId },
        ],
      },
    });

    if (existingRequest) {
      if (existingRequest.status === 'PENDING') {
        throw new ConflictException('A pending friend request already exists between you and this user');
      }
      // Re-send after a previous rejection — update the record
      if (existingRequest.senderId === senderId && existingRequest.status === 'REJECTED') {
        return this.prisma.friendRequest.update({
          where: { id: existingRequest.id },
          data: { status: 'PENDING' },
        });
      }
    }

    return this.prisma.friendRequest.create({
      data: {
        senderId,
        receiverId: target.id,
        status: 'PENDING',
      },
    });
  }

  async acceptRequest(userId: string, requestId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Friend request not found');
    }

    if (request.receiverId !== userId) {
      throw new ForbiddenException('You are not the receiver of this friend request');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Request is already ${request.status.toLowerCase()}`);
    }

    // 1. Mark the request as accepted
    const updatedRequest = await this.prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: 'ACCEPTED' },
    });

    // 2. Create bidirectional Friend records atomically
    await this.prisma.$transaction([
      this.prisma.friend.create({
        data: { userId: request.senderId, friendId: request.receiverId },
      }),
      this.prisma.friend.create({
        data: { userId: request.receiverId, friendId: request.senderId },
      }),
    ]);

    return updatedRequest;
  }

  async rejectRequest(userId: string, requestId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Friend request not found');
    }

    if (request.receiverId !== userId) {
      throw new ForbiddenException('You are not the receiver of this friend request');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Request is already ${request.status.toLowerCase()}`);
    }

    return this.prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' },
    });
  }

  async cancelRequest(userId: string, requestId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Friend request not found');
    }

    if (request.senderId !== userId) {
      throw new ForbiddenException('Only the sender can cancel a friend request');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Cannot cancel a request that is already ${request.status.toLowerCase()}`);
    }

    return this.prisma.friendRequest.delete({
      where: { id: requestId },
    });
  }

  async getPendingReceived(userId: string) {
    return this.prisma.friendRequest.findMany({
      where: { receiverId: userId, status: 'PENDING' },
      include: {
        sender: {
          select: { id: true, nickname: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPendingSent(userId: string) {
    return this.prisma.friendRequest.findMany({
      where: { senderId: userId, status: 'PENDING' },
      include: {
        receiver: {
          select: { id: true, nickname: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FRIENDS LIST
  // ─────────────────────────────────────────────────────────────────────────────

  async listFriends(userId: string) {
    return this.prisma.friend.findMany({
      where: { userId },
      include: {
        friend: {
          select: {
            id: true,
            nickname: true,
            status: true,
            country: { select: { code: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async recentFriends(userId: string, limit = 10) {
    return this.prisma.friend.findMany({
      where: {
        userId,
        lastInteractedAt: { not: null },
      },
      include: {
        friend: {
          select: { id: true, nickname: true, status: true },
        },
      },
      orderBy: { lastInteractedAt: 'desc' },
      take: limit,
    });
  }

  async favoriteFriends(userId: string) {
    return this.prisma.friend.findMany({
      where: { userId, isFavorite: true },
      include: {
        friend: {
          select: { id: true, nickname: true, status: true },
        },
      },
      orderBy: { lastInteractedAt: 'desc' },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FRIEND MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────────

  async removeFriend(userId: string, friendUserId: string) {
    const record = await this.prisma.friend.findFirst({
      where: { userId, friendId: friendUserId },
    });

    if (!record) {
      throw new NotFoundException('Friend relationship not found');
    }

    // Delete both direction records in a transaction
    await this.prisma.$transaction([
      this.prisma.friend.deleteMany({
        where: { userId, friendId: friendUserId },
      }),
      this.prisma.friend.deleteMany({
        where: { userId: friendUserId, friendId: userId },
      }),
    ]);

    return { removed: true };
  }

  async toggleFavorite(userId: string, friendUserId: string, isFavorite: boolean) {
    const record = await this.prisma.friend.findFirst({
      where: { userId, friendId: friendUserId },
    });

    if (!record) {
      throw new NotFoundException('Friend relationship not found');
    }

    return this.prisma.friend.update({
      where: { id: record.id },
      data: { isFavorite },
    });
  }

  /**
   * Called by RoomsService/ChatService after a call or message exchange
   * to keep the "recent friends" list accurate.
   */
  async touchLastInteracted(userId: string, friendUserId: string) {
    const now = new Date();
    await this.prisma.friend.updateMany({
      where: {
        OR: [
          { userId, friendId: friendUserId },
          { userId: friendUserId, friendId: userId },
        ],
      },
      data: { lastInteractedAt: now },
    });
  }
}
