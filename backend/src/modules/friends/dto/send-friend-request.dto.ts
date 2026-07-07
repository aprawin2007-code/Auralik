import { IsString, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendFriendRequestDto {
  @ApiProperty({
    description: 'Device ID of the target user — keeps identity anonymous while locating the peer',
  })
  @IsString()
  @IsNotEmpty()
  targetDeviceId!: string;
}
