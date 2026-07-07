import { IsString, IsOptional, MaxLength, IsArray, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiProperty({ required: true, description: 'Unique device identifier to locate or create session' })
  @IsString()
  @IsNotEmpty()
  deviceId!: string;

  @ApiProperty({ required: false, description: 'Optional nickname for anonymous user session' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string;

  @ApiProperty({ required: false, description: 'Optional list of interest vibe IDs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @ApiProperty({ required: false, description: 'Optional list of language code/ID mappings' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @ApiProperty({ required: false, description: 'Optional country code configuration' })
  @IsOptional()
  @IsString()
  countryCode?: string;
}
