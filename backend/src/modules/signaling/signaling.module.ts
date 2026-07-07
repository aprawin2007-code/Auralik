import { Module } from '@nestjs/common';
import { SignalingGateway } from './signaling.gateway';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [JwtModule.register({})],
  providers: [SignalingGateway],
})
export class SignalingModule {}
