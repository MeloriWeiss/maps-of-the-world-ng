import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AccessRequest,
  JwtAccessGuard,
  OptionalAccessRequest,
  OptionalJwtAccessGuard,
} from '@wm/api/api-auth';
import {
  CreateForumCommentDto,
  CreateForumDiscussionDto,
  ListForumDiscussionsDto,
} from './forum.dto';
import { ForumService } from './forum.service';

@Controller()
@ApiTags('forum')
export class ForumController {
  constructor(private readonly forumService: ForumService) {}

  @Get('forum-categories')
  @ApiOperation({ summary: 'List forum categories' })
  categories() {
    return this.forumService.categories();
  }

  @Get('forum-discussions')
  @UseGuards(OptionalJwtAccessGuard)
  @ApiOperation({ summary: 'List forum discussions' })
  discussions(
    @Query() query: ListForumDiscussionsDto,
    @Req() request: OptionalAccessRequest,
  ) {
    return this.forumService.discussions(query, request.user?.profileId);
  }

  @Get('forum-discussions/:id')
  @UseGuards(OptionalJwtAccessGuard)
  @ApiOperation({ summary: 'Read a forum discussion' })
  discussion(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: OptionalAccessRequest,
  ) {
    return this.forumService.discussion(id, request.user?.profileId);
  }

  @Post('forum-discussions')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Create a forum discussion' })
  createDiscussion(
    @Body() dto: CreateForumDiscussionDto,
    @Req() request: AccessRequest,
  ) {
    return this.forumService.createDiscussion(request.user.profileId, dto);
  }

  @Post('forum-discussions/:id/comments')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Add a comment or reply to a discussion' })
  createComment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateForumCommentDto,
    @Req() request: AccessRequest,
  ) {
    return this.forumService.createComment(id, request.user.profileId, dto);
  }

  @Post('forum-discussions/:id/likes')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Like a forum discussion' })
  like(@Param('id', ParseIntPipe) id: number, @Req() request: AccessRequest) {
    return this.forumService.like(id, request.user.profileId);
  }

  @Delete('forum-discussions/:id/likes')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Remove my like from a forum discussion' })
  unlike(@Param('id', ParseIntPipe) id: number, @Req() request: AccessRequest) {
    return this.forumService.unlike(id, request.user.profileId);
  }
}
