import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ChatService } from '../chat/chat.service';
import { FriendsService } from '../friends/friends.service';

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatService: ChatService,
    private readonly friendsService: FriendsService,
  ) {}

  async createRoom(user1Id: string, user2Id: string) {
    if (user1Id === user2Id) {
      throw new ConflictException('Cannot establish a call matching yourself');
    }

    // Check if there is already an active match between these users
    const existingActive = await this.prisma.activeMatch.findFirst({
      where: {
        OR: [
          { user1Id, user2Id, status: 'ACTIVE' },
          { user1Id: user2Id, user2Id: user1Id, status: 'ACTIVE' },
        ],
      },
    });

    if (existingActive) {
      return existingActive;
    }

    // Create a new match entry
    const match = await this.prisma.activeMatch.create({
      data: {
        user1Id,
        user2Id,
        status: 'ACTIVE',
      },
    });

    // Update users' status to IN_CALL
    await this.prisma.anonymousUser.updateMany({
      where: { id: { in: [user1Id, user2Id] } },
      data: { status: 'IN_CALL' },
    });

    return match;
  }

  async endRoom(matchId: string) {
    const match = await this.prisma.activeMatch.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      throw new NotFoundException(`Room match with ID ${matchId} not found`);
    }

    const endedMatch = await this.prisma.activeMatch.update({
      where: { id: matchId },
      data: {
        status: 'ENDED',
        endedAt: new Date(),
      },
    });

    // 2. Revert status of both participants to ONLINE
    await this.prisma.anonymousUser.updateMany({
      where: { id: { in: [match.user1Id, match.user2Id] } },
      data: { status: 'ONLINE' },
    });

    // 3. Auto-cleanup of temporary chat data after session ends (unless friendship is established)
    const isFriend = await this.prisma.friend.findFirst({
      where: {
        OR: [
          { userId: match.user1Id, friendId: match.user2Id },
          { userId: match.user2Id, friendId: match.user1Id },
        ],
      },
    });

    if (!isFriend) {
      await this.chatService.cleanupRoomChat(matchId);
    } else {
      // 4. Update lastInteractedAt so Recent Friends list stays accurate
      await this.friendsService.touchLastInteracted(match.user1Id, match.user2Id);
    }

    return endedMatch;
  }

  async getActiveByUser(userId: string) {
    return this.prisma.activeMatch.findFirst({
      where: {
        OR: [
          { user1Id: userId, status: 'ACTIVE' },
          { user2Id: userId, status: 'ACTIVE' },
        ],
      },
      include: {
        user1: true,
        user2: true,
      },
    });
  }
}
