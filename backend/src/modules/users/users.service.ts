import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string) {
    const user = await this.prisma.anonymousUser.findUnique({
      where: { id },
      include: {
        country: true,
        preferences: true,
        interests: { include: { interest: true } },
        languages: { include: { language: true } },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.anonymousUser.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // 1. Prepare base update payload
    const updatePayload: any = {};
    if (dto.nickname !== undefined) updatePayload.nickname = dto.nickname;
    if (dto.status !== undefined) updatePayload.status = dto.status;
    if (dto.countryId !== undefined) updatePayload.countryId = dto.countryId;

    const updatedUser = await this.prisma.anonymousUser.update({
      where: { id },
      data: updatePayload,
    });

    // 2. Refresh interests if provided
    if (dto.interests) {
      await this.prisma.anonymousUserInterest.deleteMany({
        where: { userId: id },
      });

      const interestMatches = await this.prisma.interest.findMany({
        where: { name: { in: dto.interests } },
      });

      for (const item of interestMatches) {
        await this.prisma.anonymousUserInterest.create({
          data: {
            userId: id,
            interestId: item.id,
          },
        });
      }
    }

    // 3. Refresh languages if provided
    if (dto.languages) {
      await this.prisma.anonymousUserLanguage.deleteMany({
        where: { userId: id },
      });

      const languageMatches = await this.prisma.language.findMany({
        where: { code: { in: dto.languages } },
      });

      for (const item of languageMatches) {
        await this.prisma.anonymousUserLanguage.create({
          data: {
            userId: id,
            languageId: item.id,
          },
        });
      }
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    await this.prisma.anonymousUser.delete({
      where: { id },
    });
    return { id, deleted: true };
  }
}
