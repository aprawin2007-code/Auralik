import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/redis/redis.service';
import { PrismaService } from '@/prisma/prisma.service';

export interface WaitingUser {
  userId: string;
  socketId: string;
  joinedAt: number;
  interests: string[];
  language?: string;
  country?: string;
}

@Injectable()
export class MatchmakingService {
  private readonly logger = new Logger('MatchmakingService');
  private readonly REDIS_QUEUE_KEY = 'matchmaking:waiting';
  private readonly RECENT_MATCH_TTL = 300; // 5 minutes in seconds

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async addUserToQueue(user: WaitingUser): Promise<void> {
    const client = this.redis.getClient();
    
    // Cache user's current search preferences
    await client.hset(`matchmaking:preferences:${user.userId}`, {
      interests: JSON.stringify(user.interests),
      language: user.language || '',
      country: user.country || '',
    });

    // Add user details into a hash key for quick property lookups
    await client.hset(`matchmaking:user:${user.userId}`, {
      socketId: user.socketId,
      joinedAt: user.joinedAt.toString(),
      interests: JSON.stringify(user.interests),
      language: user.language || '',
      country: user.country || '',
    });

    // Add user ID to the sorted set sorted by joinedAt timestamp (ensuring FIFO order)
    await client.zadd(this.REDIS_QUEUE_KEY, user.joinedAt, user.userId);

    this.logger.log(`Added user ${user.userId} to matchmaking queue`);
  }

  async getPreferences(userId: string): Promise<{ interests: string[]; language?: string; country?: string } | null> {
    const client = this.redis.getClient();
    const data = await client.hgetall(`matchmaking:preferences:${userId}`);
    if (!data || Object.keys(data).length === 0) return null;

    return {
      interests: JSON.parse(data.interests || '[]'),
      language: data.language || undefined,
      country: data.country || undefined,
    };
  }

  async removeUserFromQueue(userId: string): Promise<void> {
    const client = this.redis.getClient();
    await client.zrem(this.REDIS_QUEUE_KEY, userId);
    await client.del(`matchmaking:user:${userId}`);
    this.logger.log(`Removed user ${userId} from matchmaking queue`);
  }

  async addRecentMatch(userId: string, matchedUserId: string): Promise<void> {
    const client = this.redis.getClient();
    const expiration = Date.now() + this.RECENT_MATCH_TTL * 1000;
    
    await client.zadd(`matchmaking:recent:${userId}`, expiration, matchedUserId);
    await client.zadd(`matchmaking:recent:${matchedUserId}`, expiration, userId);
    
    // Set set expiration for cleanup
    await client.expire(`matchmaking:recent:${userId}`, this.RECENT_MATCH_TTL);
    await client.expire(`matchmaking:recent:${matchedUserId}`, this.RECENT_MATCH_TTL);
  }

  async isRecentMatch(userId: string, matchedUserId: string): Promise<boolean> {
    const client = this.redis.getClient();
    const key = `matchmaking:recent:${userId}`;
    
    // Clear expired recent matches
    await client.zremrangebyscore(key, 0, Date.now());
    
    const score = await client.zscore(key, matchedUserId);
    return score !== null;
  }

  async findMatch(userId: string): Promise<{ matchedUser: WaitingUser } | null> {
    const client = this.redis.getClient();
    
    // Fetch waiting user details
    const userData = await client.hgetall(`matchmaking:user:${userId}`);
    if (!userData || Object.keys(userData).length === 0) return null;

    const user: WaitingUser = {
      userId,
      socketId: userData.socketId,
      joinedAt: parseInt(userData.joinedAt, 10),
      interests: JSON.parse(userData.interests || '[]'),
      language: userData.language,
      country: userData.country,
    };

    // Get all users in queue ordered by joined time
    const waitingIds = await client.zrange(this.REDIS_QUEUE_KEY, 0, -1);

    for (const opponentId of waitingIds) {
      if (opponentId === userId) continue;

      // 1. Prevent matching the same user repeatedly
      const recent = await this.isRecentMatch(userId, opponentId);
      if (recent) continue;

      const opponentData = await client.hgetall(`matchmaking:user:${opponentId}`);
      if (!opponentData || Object.keys(opponentData).length === 0) continue;

      const opponent: WaitingUser = {
        userId: opponentId,
        socketId: opponentData.socketId,
        joinedAt: parseInt(opponentData.joinedAt, 10),
        interests: JSON.parse(opponentData.interests || '[]'),
        language: opponentData.language,
        country: opponentData.country,
      };

      // 2. Matching score calculations based on Language, Country, and Interests
      let matchScore = 0;

      // Match by Language (highest priority)
      if (user.language && opponent.language && user.language === opponent.language) {
        matchScore += 5;
      }

      // Match by Country
      if (user.country && opponent.country && user.country === opponent.country) {
        matchScore += 3;
      }

      // Match by Interests
      const sharedInterests = user.interests.filter(i => opponent.interests.includes(i));
      matchScore += sharedInterests.length * 2;

      // Decision criteria: If they share fields (score > 0) OR if it is a fallback broad search (interests empty on either side)
      const isMatch =
        matchScore > 0 ||
        user.interests.length === 0 ||
        opponent.interests.length === 0;

      if (isMatch) {
        // Remove both from queue atomically
        await this.removeUserFromQueue(userId);
        await this.removeUserFromQueue(opponentId);

        // Record matched pair in recent history
        await this.addRecentMatch(userId, opponentId);

        this.logger.log(`Match found between ${userId} and ${opponentId} with score ${matchScore}`);
        return { matchedUser: opponent };
      }
    }

    return null;
  }
}
