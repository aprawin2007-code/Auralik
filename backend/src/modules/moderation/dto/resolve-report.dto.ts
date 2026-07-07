import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ResolveAction {
  RESOLVE = 'RESOLVED',
  DISMISS = 'DISMISSED',
}

export class ResolveReportDto {
  @ApiProperty({ description: 'Resolution status (RESOLVED or DISMISSED)', enum: ResolveAction })
  @IsEnum(ResolveAction)
  @IsNotEmpty()
  action!: ResolveAction;

  @ApiProperty({ description: 'Notes or reasoning for the resolution' })
  @IsString()
  @IsNotEmpty()
  notes!: string;
}
