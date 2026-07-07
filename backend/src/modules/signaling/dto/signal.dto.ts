import { IsString, IsNotEmpty, IsObject } from 'class-validator';

export class SignalDto {
  @IsString()
  @IsNotEmpty()
  to!: string;

  @IsObject()
  @IsNotEmpty()
  signal!: any;
}
