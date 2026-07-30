import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AccessRequest, JwtAccessGuard } from '@wm/api/api-auth';
import { AccountsService, AvatarsService } from '../service';
import { AccountDto, ProfileSummaryDto, UpdateAccountDto } from '../dto';
import { UploadedImageFile } from '@wm/api/api-shared';
import { Response } from 'express';

@ApiTags('Accounts')
@Controller('accounts')
export class AccountsController {
  #accountsService: AccountsService;
  #avatarsService: AvatarsService;

  constructor(
    accountsService: AccountsService,
    avatarsService: AvatarsService,
  ) {
    this.#accountsService = accountsService;
    this.#avatarsService = avatarsService;
  }

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

    return this.#accountsService.getAccount(id);
  }

  @UseGuards(JwtAccessGuard)
  @Get('/me/summary')
  @ApiOperation({ summary: 'Get my public profile summary' })
  @ApiOkResponse({ type: ProfileSummaryDto })
  getMyProfileSummary(@Req() req: AccessRequest) {
    return this.#accountsService.getMyProfileSummary(req.user.profileId);
  }

  @UseGuards(JwtAccessGuard)
  @Post('/me/avatar')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5_000_000 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload or replace my avatar' })
  uploadAvatar(
    @Req() req: AccessRequest,
    @UploadedFile() file?: UploadedImageFile,
  ) {
    if (!file) throw new BadRequestException('Avatar file is required');
    return this.#avatarsService.upload(req.user.profileId, file);
  }

  @UseGuards(JwtAccessGuard)
  @Delete('/me/avatar')
  @ApiOperation({ summary: 'Delete my avatar' })
  removeAvatar(@Req() req: AccessRequest) {
    return this.#avatarsService.remove(req.user.profileId);
  }

  @Get('/profiles/:userId/avatar')
  @Header('Cache-Control', 'public, max-age=300')
  @ApiOperation({ summary: "Read user's avatar image" })
  async getAvatar(
    @Param('userId', ParseIntPipe) userId: number,
    @Res() response: Response,
  ) {
    const avatar = await this.#avatarsService.getByUserId(userId);
    response.type(avatar.mimeType).send(avatar.body);
  }

  @UseGuards(JwtAccessGuard)
  @Get('/profiles/:userId')
  @ApiOperation({ summary: "Get user's public profile summary by user ID" })
  @ApiOkResponse({ type: ProfileSummaryDto })
  getPublicProfileSummary(@Param('userId', ParseIntPipe) userId: number) {
    return this.#accountsService.getPublicProfileSummary(userId);
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
    return this.#accountsService.getAccount(id);
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
    return this.#accountsService.updateAccount(profileId, dto);
  }
}
