import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
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
  Roles,
  RolesGuard,
} from '@wm/api/auth';
import {
  CreateForumCommentDto,
  CreateForumDiscussionDto,
  ListForumDiscussionsDto,
  ForumCommentsQueryDto,
  ForumDetailsQueryDto,
  EditForumCommentDto,
  ModerateForumDto,
  ForumCommentVisibilityDto,
} from './forum.dto';
import { ForumService } from './forum.service';
import { UserRole } from '@wm/shared/users';

@Controller()
/** Обрабатывает HTTP-запросы к темам и комментариям форума. */
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
    @Query() query: ForumDetailsQueryDto,
  ) {
    return this.forumService.discussion(
      id,
      request.user?.profileId,
      query.includeComments !== 'false',
    );
  }

  @Get('forum-discussions/:id/comments')
  @UseGuards(OptionalJwtAccessGuard)
  @ApiOperation({
    summary:
      'Read comments or a tree branch; commentId in tree mode returns the root page and ancestor path',
  })
  comments(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ForumCommentsQueryDto,
    @Req() request: OptionalAccessRequest,
  ) {
    return this.forumService.comments(id, query, request.user?.profileId);
  }

  @Patch('forum-discussions/:id')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Edit my open discussion' })
  editDiscussion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateForumDiscussionDto,
    @Req() request: AccessRequest,
  ) {
    return this.forumService.editDiscussion(id, request.user.profileId, dto);
  }

  @Patch('forum-discussions/:id/comments/:commentId')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Edit my visible comment in an open discussion' })
  editComment(
    @Param('id', ParseIntPipe) id: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() dto: EditForumCommentDto,
    @Req() request: AccessRequest,
  ) {
    return this.forumService.editComment(
      id,
      commentId,
      request.user.profileId,
      dto,
    );
  }

  @Patch('admin/forum-discussions/:id/moderation')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(UserRole.admin, UserRole.superAdmin)
  @ApiOperation({
    summary: 'Pin or close a discussion and record the moderation action',
  })
  moderateDiscussion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ModerateForumDto,
    @Req() request: AccessRequest,
  ) {
    return this.forumService.moderateDiscussion(id, request.user.userId, dto);
  }

  @Patch('admin/forum-discussions/:id/comments/:commentId/visibility')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(UserRole.admin, UserRole.superAdmin)
  @ApiOperation({
    summary: 'Hide or restore a comment while preserving replies',
  })
  moderateComment(
    @Param('id', ParseIntPipe) id: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() dto: ForumCommentVisibilityDto,
    @Req() request: AccessRequest,
  ) {
    return this.forumService.moderateComment(
      id,
      commentId,
      request.user.userId,
      dto.isHidden,
    );
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
