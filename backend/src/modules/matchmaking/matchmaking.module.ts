import { Module } from '@nestjs/common';
import { MatchmakingService } from './matchmaking.service';
import { MatchmakingGateway } from './matchmaking.gateway';
import { RoomsModule } from '../rooms/rooms.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [RoomsModule, JwtModule.register({})],
  providers: [MatchmakingService, MatchmakingGateway],
  exports: [MatchmakingService],
})
export class MatchmakingModule {}
