import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AccessRequest, JwtAccessGuard } from '@wm/api/api-auth';
import { AccountsService } from '../service';
import { AccountDto, UpdateAccountDto } from '../dto';

@ApiTags('Accounts')
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @UseGuards(JwtAccessGuard)
  @Get('/me')
  @ApiOperation({ summary: 'Get my account' })
  @ApiOkResponse({
    description: 'My profile info retrieved successfully',
    type: AccountDto,
    example: {
      nickname: 'CryptoKnight',
      firstName: 'Alexander',
      lastName: 'Mercer',
      middleName: 'Edward',
      phoneNumber: '+79994777111',
      birthDate: '1984-11-28',
      bio: 'Managing Director with 15+ years of experience in corporate finance and asset management',
      avatarUrl: 'https://company.com',
      language: 'en',
      theme: 'dark',
      createdAt: '2026-07-24T20:55:32.105Z',
      updatedAt: '2026-07-25T01:15:00.000Z',
    },
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authorized or access token is missing',
  })
  @HttpCode(HttpStatus.OK)
  getMyAccount(@Req() req: AccessRequest) {
    const id = req.user.profileId;

    return this.accountsService.getAccount(id);
  }

  @UseGuards(JwtAccessGuard)
  @Get(':id')
  @ApiOperation({ summary: "Get user's account by ID" })
  @ApiOkResponse({
    description: "User's account info retrieved successfully",
    type: AccountDto,
    example: {
      nickname: 'CryptoKnight',
      firstName: 'Alexander',
      lastName: 'Mercer',
      middleName: 'Edward',
      phoneNumber: '+79994777111',
      birthDate: '1984-11-28',
      bio: 'Managing Director with 15+ years of experience in corporate finance and asset management',
      avatarUrl: 'https://company.com',
      language: 'en',
      theme: 'dark',
      createdAt: '2026-07-24T20:55:32.105Z',
      updatedAt: '2026-07-25T01:15:00.000Z',
    },
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authorized or access token is missing',
  })
  @HttpCode(HttpStatus.OK)
  getAccount(@Param('id') id: number) {
    return this.accountsService.getAccount(id);
  }

  @UseGuards(JwtAccessGuard)
  @Patch('/me')
  @ApiOperation({ summary: 'Update my account' })
  @ApiCreatedResponse({
    type: UpdateAccountDto,
    description: 'Profile is successfully updated',
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authorized or access token is missing',
  })
  @ApiBadRequestResponse({ description: 'Request body cannot be empty' })
  @HttpCode(HttpStatus.CREATED)
  updateAccount(@Req() req: AccessRequest, @Body() dto: UpdateAccountDto) {
    const { profileId } = req.user;
    return this.accountsService.updateAccount(profileId, dto);
  }
}
