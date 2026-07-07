import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ToggleFavoriteDto {
  @ApiProperty({ description: 'Set true to mark as favourite, false to unmark' })
  @IsBoolean()
  isFavorite!: boolean;
}
