import { IsOptional, IsString, IsArray } from 'class-validator';

export class MatchRequestDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @IsOptional()
  @IsString()
  languageCode?: string;

  @IsOptional()
  @IsString()
  countryCode?: string;
}
