import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configModules } from './config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { MatchmakingModule } from './modules/matchmaking/matchmaking.module';
import { SignalingModule } from './modules/signaling/signaling.module';
import { ChatModule } from './modules/chat/chat.module';
import { HealthModule } from './modules/health/health.module';
import { FriendsModule } from './modules/friends/friends.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { AdminDashboardModule } from './modules/admin-dashboard/admin-dashboard.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: configModules,
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    RoomsModule,
    MatchmakingModule,
    SignalingModule,
    ChatModule,
    HealthModule,
    FriendsModule,
    ModerationModule,
    AdminDashboardModule,
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationIdMiddleware, LoggerMiddleware)
      .forRoutes('*');
  }
}
