import { UserRoleType, UserStatusType } from '@wm/shared/users';

export interface AdminDashboardDto {
  users: number;
  blockedUsers: number;
  maps: number;
  texturePacks: number;
  discussions: number;
  comments: number;
}

export interface AdminSystemStatusDto {
  status: 'available' | 'degraded';
  checkedAt: string;
  uptimeSeconds: number;
  version: string;
  resources: {
    database: AdminSystemResourceStatusDto;
    objectStorage: AdminSystemResourceStatusDto;
  };
}

export interface AdminSystemResourceStatusDto {
  status: 'available' | 'unavailable';
  responseTimeMs: number;
}

export type AnalyticsInterval = 'hour' | 'day' | 'week' | 'month' | 'year';

export interface AdminUserAnalyticsDto {
  period: { from: string; to: string; interval: AnalyticsInterval };
  summary: {
    totalUsers: number;
    registered: number;
    visits: number;
    uniqueVisitors: number;
  };
  series: {
    from: string;
    registrations: number;
    visits: number;
    uniqueVisitors: number;
  }[];
}

export interface AdminUserDto {
  id: number;
  email: string;
  username: string;
  role: UserRoleType;
  status: UserStatusType;
  createdAt: string;
}

export interface AdminUsersPageDto {
  items: AdminUserDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminMapDto {
  id: number;
  name: string;
  isPublished: boolean;
  isHidden: boolean;
  likesCount: number;
  commentsCount: number;
  authorAccount: { nickname: string; userId: number };
}

export interface AdminTexturePackDto {
  id: string;
  name: string;
  isPublished: boolean;
  isHidden: boolean;
  likesCount: number;
  updatedAt: string;
  owner: { nickname: string; userId: number };
  _count: { textures: number };
}

export interface AdminDiscussionDto {
  id: number;
  title: string;
  isHidden: boolean;
  likesCount: number;
  commentsCount: number;
  updatedAt: string;
  authorAccount: { nickname: string; userId: number };
  category: { title: string };
}

export interface AdminPageDto<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type AdminContentTab = 'maps' | 'texture-packs' | 'discussions';
export type AdminContentVisibility = 'visible' | 'hidden' | '';
export type AdminContentPublication = 'published' | 'draft' | '';

export interface AdminContentFilters {
  search: string;
  author: string;
  visibility: AdminContentVisibility;
  publication: AdminContentPublication;
  category: string;
}

export interface AdminAuditDto {
  id: number;
  action: string;
  targetType: string;
  targetId: string;
  targetName: string | null;
  details: unknown;
  createdAt: string;
  actor: {
    id: number;
    username: string;
    email: string;
    personalAccount: { nickname: string } | null;
  };
}

export type AdminAuditAction =
  | 'USER_ROLE_CHANGED'
  | 'USER_STATUS_CHANGED'
  | 'CONTENT_VISIBILITY_CHANGED';

export type AdminAuditTargetType =
  | 'USER'
  | 'MAP'
  | 'TEXTURE_PACK'
  | 'FORUM_DISCUSSION';

export interface AdminAuditFilters {
  actor: string;
  action: AdminAuditAction | '';
  targetType: AdminAuditTargetType | '';
  targetId: string;
  from: string;
  to: string;
}
