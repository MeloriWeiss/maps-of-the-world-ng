import type { UserRoleType, UserStatusType } from '@wm/shared/users';

/** Сводные счётчики административной панели. */
export interface AdminDashboardDto {
  users: number;
  blockedUsers: number;
  maps: number;
  texturePacks: number;
  discussions: number;
  comments: number;
}

/** Снимок доступности API и его внешних ресурсов на момент проверки. */
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

/** Доступность отдельного ресурса и длительность его проверки. */
export interface AdminSystemResourceStatusDto {
  status: 'available' | 'unavailable';
  responseTimeMs: number;
}

/** Поддерживаемые API интервалы группировки статистики. */
export type AnalyticsInterval = 'hour' | 'day' | 'week' | 'month' | 'year';

/** Статистика пользователей и посещений с итогами и временным рядом. */
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

/** Данные пользователя, доступные административному разделу. */
export interface AdminUserDto {
  id: number;
  email: string;
  username: string;
  role: UserRoleType;
  status: UserStatusType;
  createdAt: string;
}

/** Страница пользователей с общим количеством результатов. */
export interface AdminUsersPageDto {
  items: AdminUserDto[];
  total: number;
  page: number;
  pageSize: number;
}

/** Карта в списке модерации. */
export interface AdminMapDto {
  id: number;
  name: string;
  isPublished: boolean;
  isHidden: boolean;
  likesCount: number;
  commentsCount: number;
  authorAccount: { nickname: string; userId: number };
}

/** Набор текстур в списке модерации. */
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

/** Обсуждение форума в списке модерации. */
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

/** Страница административной выборки с метаданными пагинации. */
export interface AdminPageDto<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Раздел контента, выбранный в панели модерации. */
export type AdminContentTab = 'maps' | 'texture-packs' | 'discussions';

/** Состояние видимости материала для фильтра списка модерации. */
export type AdminContentVisibility = 'visible' | 'hidden' | '';

/** Состояние публикации материала для фильтра списка модерации. */
export type AdminContentPublication = 'published' | 'draft' | '';

/** Значения фильтров материалов; пустая строка отключает соответствующий фильтр. */
export interface AdminContentFilters {
  search: string;
  author: string;
  visibility: AdminContentVisibility;
  publication: AdminContentPublication;
  category: string;
}

/** Запись аудита с участником, объектом действия и дополнительными данными. */
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

/** Виды действий, отображаемые в журнале аудита. */
export type AdminAuditAction =
  | 'USER_ROLE_CHANGED'
  | 'USER_STATUS_CHANGED'
  | 'CONTENT_VISIBILITY_CHANGED';

/** Типы сущностей, к которым относятся записи журнала аудита. */
export type AdminAuditTargetType =
  | 'USER'
  | 'MAP'
  | 'TEXTURE_PACK'
  | 'FORUM_DISCUSSION';

/** Фильтры журнала аудита; даты передаются из формы в формате YYYY-MM-DD. */
export interface AdminAuditFilters {
  actor: string;
  action: AdminAuditAction | '';
  targetType: AdminAuditTargetType | '';
  targetId: string;
  from: string;
  to: string;
}
