import { AdminAuditDto } from './admin.models';
import { presentAdminAuditEntry } from './audit-entry.presenter';

const auditEntry = (changes: Partial<AdminAuditDto> = {}): AdminAuditDto => ({
  id: 1,
  action: 'CONTENT_VISIBILITY_CHANGED',
  targetType: 'MAP',
  targetId: '42',
  targetName: 'Подземелье',
  details: { isHidden: true },
  createdAt: '2026-08-14T10:00:00.000Z',
  actor: {
    id: 7,
    username: 'moderator',
    email: 'moderator@example.com',
    personalAccount: { nickname: 'Хранитель' },
  },
  ...changes,
});

describe('presentAdminAuditEntry', () => {
  it('describes hidden content using its name', () => {
    const result = presentAdminAuditEntry(auditEntry());

    expect(result.actionLabel).toBe('Скрыл материал');
    expect(result.targetLabel).toBe('Карта «Подземелье»');
  });

  it('describes a restored content item', () => {
    const result = presentAdminAuditEntry(
      auditEntry({ details: { isHidden: false } }),
    );

    expect(result.actionLabel).toBe('Восстановил материал');
  });

  it('uses a technical target fallback when the object is unavailable', () => {
    const result = presentAdminAuditEntry(auditEntry({ targetName: null }));

    expect(result.targetLabel).toBe('Карта #42');
  });

  it('translates a changed user role', () => {
    const result = presentAdminAuditEntry(
      auditEntry({
        action: 'USER_ROLE_CHANGED',
        targetType: 'USER',
        targetName: 'Иван',
        details: { role: 'ADMIN' },
      }),
    );

    expect(result.actionLabel).toBe('Изменил роль');
    expect(result.changeLabel).toBe('Новая роль: Администратор');
  });

  it('handles malformed legacy details safely', () => {
    const result = presentAdminAuditEntry(
      auditEntry({ action: 'USER_STATUS_CHANGED', details: null }),
    );

    expect(result.actionLabel).toBe('Изменил статус');
    expect(result.changeLabel).toBeNull();
  });
});
