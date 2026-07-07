import { Controller, Post, Body, Req, UseGuards, Param, Delete, Get } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  createRoom(@Req() req: any, @Body() dto: CreateRoomDto) {
    return this.roomsService.createRoom(req.user.userId, dto.user2Id);
  }

  @Get('active')
  getActiveRoom(@Req() req: any) {
    return this.roomsService.getActiveByUser(req.user.userId);
  }

  @Delete(':id/end')
  endRoom(@Param('id') id: string) {
    return this.roomsService.endRoom(id);
  }
}
