export const UserRole = {
  user: 'USER',
  admin: 'ADMIN',
  superAdmin: 'SUPER_ADMIN',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserStatus = {
  active: 'ACTIVE',
  blocked: 'BLOCKED',
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];
