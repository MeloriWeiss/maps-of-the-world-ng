import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from '../services';
import {
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserDto } from '../dto';
import { AccessRequest, JwtAccessGuard } from '@wm/api/api-auth';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAccessGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get me' })
  @ApiOkResponse({
    description: 'User retrieved successfully',
    type: UserDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authorized or access token is missing',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error while retrieving user list',
  })
  @HttpCode(HttpStatus.OK)
  async getMe(@Req() req: AccessRequest) {
    const { userId } = req.user;

    return await this.usersService.getMe(userId);
  }

  @UseGuards(JwtAccessGuard)
  @Get('/')
  @ApiOperation({ summary: 'Get list of users' })
  @ApiOkResponse({
    description: 'User list retrieved successfully',
    type: UserDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authorized or access token is missing',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error while retrieving user list',
  })
  @HttpCode(HttpStatus.OK)
  getUsers() {
    return this.usersService.getUsers();
  }
}
