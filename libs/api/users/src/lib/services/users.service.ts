import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaMainService } from '@wm/api/database-main';
import { UserResponseDto } from '@wm/shared/users';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaMainService) {}

  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('User not found');

    const result: UserResponseDto = {
      id: user.id,
      email: user.email,
      username: user.username,
    };

    return result;
  }

  getUsers() {
    return this.prisma.user.findMany();
  }
}
