import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ModerationAction {
  BAN = 'BAN',
  UNBAN = 'UNBAN',
  MUTE = 'MUTE',
  UNMUTE = 'UNMUTE',
}

export class ModerateUserDto {
  @ApiProperty({ description: 'ID of the target user to moderate' })
  @IsUUID()
  @IsNotEmpty()
  targetUserId!: string;

  @ApiProperty({ description: 'Action to perform (BAN, UNBAN, MUTE, UNMUTE)', enum: ModerationAction })
  @IsEnum(ModerationAction)
  @IsNotEmpty()
  action!: ModerationAction;

  @ApiProperty({ description: 'Duration of the ban or mute in minutes (omit or pass 0 for permanent)', required: false })
  @IsOptional()
  @Min(0)
  durationMinutes?: number;

  @ApiProperty({ description: 'Reason for the moderation action' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
