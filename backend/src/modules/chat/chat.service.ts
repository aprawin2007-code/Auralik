import { Injectable } from '@nestjs/common';
import { RedisService } from '@/redis/redis.service';
import { v4 as uuidv4 } from 'uuid';

export interface Message {
  id: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'file';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  status: 'sent' | 'delivered' | 'read';
  timestamp: number;
}

@Injectable()
export class ChatService {
  private readonly TTL = 3600; // 1 hour in seconds

  constructor(private readonly redis: RedisService) {}

  async saveMessage(
    roomId: string,
    senderId: string,
    content: string,
    type: 'text' | 'image' | 'file' = 'text',
    fileMetadata?: { fileUrl?: string; fileName?: string; fileSize?: number }
  ): Promise<Message> {
    const client = this.redis.getClient();
    const messageId = uuidv4();

    const msg: Message = {
      id: messageId,
      senderId,
      content,
      type,
      fileUrl: fileMetadata?.fileUrl,
      fileName: fileMetadata?.fileName,
      fileSize: fileMetadata?.fileSize,
      status: 'sent',
      timestamp: Date.now(),
    };

    const msgKey = `chat:message:${messageId}`;
    const listKey = `chat:room:keys:${roomId}`;

    // Store rich properties in a Redis hash
    await client.hset(msgKey, {
      id: msg.id,
      senderId: msg.senderId,
      content: msg.content,
      type: msg.type,
      fileUrl: msg.fileUrl || '',
      fileName: msg.fileName || '',
      fileSize: msg.fileSize?.toString() || '0',
      status: msg.status,
      timestamp: msg.timestamp.toString(),
    });

    // Set TTL on the message hash
    await client.expire(msgKey, this.TTL);

    // Push the key reference to the room ordered key list
    await client.rpush(listKey, msgKey);
    await client.expire(listKey, this.TTL);

    return msg;
  }

  async updateMessageStatus(messageId: string, status: 'delivered' | 'read'): Promise<void> {
    const client = this.redis.getClient();
    const msgKey = `chat:message:${messageId}`;
    
    // Check if message exists before writing
    const exists = await client.exists(msgKey);
    if (exists) {
      await client.hset(msgKey, 'status', status);
    }
  }

  async getMessages(roomId: string): Promise<Message[]> {
    const client = this.redis.getClient();
    const listKey = `chat:room:keys:${roomId}`;
    
    const msgKeys = await client.lrange(listKey, 0, -1);
    const messages: Message[] = [];

    for (const key of msgKeys) {
      const data = await client.hgetall(key);
      if (data && Object.keys(data).length > 0) {
        messages.push({
          id: data.id,
          senderId: data.senderId,
          content: data.content,
          type: data.type as 'text' | 'image' | 'file',
          fileUrl: data.fileUrl || undefined,
          fileName: data.fileName || undefined,
          fileSize: data.fileSize ? parseInt(data.fileSize, 10) : undefined,
          status: data.status as 'sent' | 'delivered' | 'read',
          timestamp: parseInt(data.timestamp, 10),
        });
      }
    }

    return messages;
  }

  async cleanupRoomChat(roomId: string): Promise<void> {
    const client = this.redis.getClient();
    const listKey = `chat:room:keys:${roomId}`;
    
    // Retrieve all message hash keys
    const msgKeys = await client.lrange(listKey, 0, -1);
    
    // Delete each hash message entry
    for (const key of msgKeys) {
      await client.del(key);
    }
    
    // Delete the room key list
    await client.del(listKey);
  }
}
