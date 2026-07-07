import { IsString, IsNotEmpty, IsUUID, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReportUserDto {
  @ApiProperty({ description: 'ID of the reported user' })
  @IsUUID()
  @IsNotEmpty()
  reportedUserId!: string;

  @ApiProperty({ description: 'Reason for reporting (e.g., SPAM, INAPPROPRIATE_BEHAVIOR, HARASSMENT, VEHICLE_SAFETY, OTHER)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  reason!: string;

  @ApiProperty({ description: 'Detailed description of the incident', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
