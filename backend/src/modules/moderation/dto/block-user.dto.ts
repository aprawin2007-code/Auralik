import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BlockUserDto {
  @ApiProperty({ description: 'ID of the user to block' })
  @IsUUID()
  @IsNotEmpty()
  blockedUserId!: string;
}
