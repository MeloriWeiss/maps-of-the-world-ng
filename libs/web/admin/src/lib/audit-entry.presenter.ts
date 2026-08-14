import { AdminAuditDto } from './admin.models';

export interface AdminAuditViewModel extends AdminAuditDto {
  actionLabel: string;
  targetLabel: string;
  changeLabel: string | null;
}

const targetTypeLabels: Record<string, string> = {
  USER: 'Пользователь',
  MAP: 'Карта',
  TEXTURE_PACK: 'Набор текстур',
  FORUM_DISCUSSION: 'Тема форума',
};

const roleLabels: Record<string, string> = {
  USER: 'Пользователь',
  ADMIN: 'Администратор',
  SUPER_ADMIN: 'Суперадминистратор',
};

const statusLabels: Record<string, string> = {
  ACTIVE: 'Активен',
  BLOCKED: 'Заблокирован',
};

export const presentAdminAuditEntry = (
  item: AdminAuditDto,
): AdminAuditViewModel => ({
  ...item,
  actionLabel: actionLabel(item),
  targetLabel: targetLabel(item),
  changeLabel: changeLabel(item),
});

const actionLabel = (item: AdminAuditDto) => {
  if (item.action === 'USER_ROLE_CHANGED') return 'Изменил роль';
  if (item.action === 'USER_STATUS_CHANGED') return 'Изменил статус';
  if (item.action === 'CONTENT_VISIBILITY_CHANGED') {
    return detailValue(item.details, 'isHidden') === true
      ? 'Скрыл материал'
      : 'Восстановил материал';
  }
  return item.action;
};

const targetLabel = (item: AdminAuditDto) => {
  const type = targetTypeLabels[item.targetType] ?? item.targetType;
  return item.targetName
    ? `${type} «${item.targetName}»`
    : `${type} #${item.targetId}`;
};

const changeLabel = (item: AdminAuditDto) => {
  if (item.action === 'USER_ROLE_CHANGED') {
    const role = detailValue(item.details, 'role');
    return typeof role === 'string'
      ? `Новая роль: ${roleLabels[role] ?? role}`
      : null;
  }
  if (item.action === 'USER_STATUS_CHANGED') {
    const status = detailValue(item.details, 'status');
    return typeof status === 'string'
      ? `Новый статус: ${statusLabels[status] ?? status}`
      : null;
  }
  return null;
};

const detailValue = (details: unknown, key: string): unknown => {
  if (!isUnknownRecord(details)) return undefined;
  return details[key];
};

const isUnknownRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
