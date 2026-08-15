import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessRequest, JwtAccessGuard, Roles, RolesGuard } from '@wm/api/auth';
import { UserRole } from '@wm/shared/users';
import { AdminService } from './admin.service';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { AdminListQueryDto } from './dto/admin-list-query.dto';
import { UpdateContentVisibilityDto } from './dto/update-content-visibility.dto';
import { UserAnalyticsQueryDto } from './dto/user-analytics-query.dto';
import { AdminAuditQueryDto } from './dto/admin-audit-query.dto';
import { AdminSystemStatusService } from './admin-system-status.service';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.admin, UserRole.superAdmin)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly systemStatusService: AdminSystemStatusService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard summary' })
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('system-status')
  @ApiOperation({ summary: 'Get API dependencies and runtime status' })
  getSystemStatus() {
    return this.systemStatusService.getStatus();
  }

  @Get('user-analytics')
  @ApiOperation({ summary: 'Get registrations and site visits over time' })
  getUserAnalytics(@Query() query: UserAnalyticsQueryDto) {
    return this.adminService.getUserAnalytics(query);
  }

  @Get('users')
  @ApiOperation({ summary: 'Get paginated users for administration' })
  getUsers(@Query() query: AdminUsersQueryDto) {
    return this.adminService.getUsers(query);
  }

  @Get('maps')
  @ApiOperation({ summary: 'Get maps for moderation' })
  getMaps(@Query() query: AdminListQueryDto) {
    return this.adminService.getMaps(query);
  }

  @Patch('maps/:id/visibility')
  @ApiOperation({ summary: 'Hide or restore a map' })
  updateMapVisibility(
    @Req() request: AccessRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateContentVisibilityDto,
  ) {
    return this.adminService.updateMapVisibility(
      request.user.userId,
      id,
      dto.isHidden,
    );
  }

  @Get('texture-packs')
  @ApiOperation({ summary: 'Get texture packs for moderation' })
  getTexturePacks(@Query() query: AdminListQueryDto) {
    return this.adminService.getTexturePacks(query);
  }

  @Patch('texture-packs/:id/visibility')
  @ApiOperation({ summary: 'Hide or restore a texture pack' })
  updateTexturePackVisibility(
    @Req() request: AccessRequest,
    @Param('id') id: string,
    @Body() dto: UpdateContentVisibilityDto,
  ) {
    return this.adminService.updateTexturePackVisibility(
      request.user.userId,
      id,
      dto.isHidden,
    );
  }

  @Get('forum-discussions')
  @ApiOperation({ summary: 'Get forum discussions for moderation' })
  getDiscussions(@Query() query: AdminListQueryDto) {
    return this.adminService.getDiscussions(query);
  }

  @Patch('forum-discussions/:id/visibility')
  @ApiOperation({ summary: 'Hide or restore a forum discussion' })
  updateDiscussionVisibility(
    @Req() request: AccessRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateContentVisibilityDto,
  ) {
    return this.adminService.updateDiscussionVisibility(
      request.user.userId,
      id,
      dto.isHidden,
    );
  }

  @Get('audit')
  @ApiOperation({ summary: 'Get administrator audit log' })
  getAudit(@Query() query: AdminAuditQueryDto) {
    return this.adminService.getAudit(query);
  }

  @Patch('users/:id/role')
  @Roles(UserRole.superAdmin)
  @ApiOperation({ summary: 'Grant or revoke administrator role' })
  updateRole(
    @Req() request: AccessRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminService.updateRole(request.user.userId, id, dto.role);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Block or unblock a user' })
  updateStatus(
    @Req() request: AccessRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateStatus(
      request.user.userId,
      request.user.role,
      id,
      dto.status,
    );
  }
}
