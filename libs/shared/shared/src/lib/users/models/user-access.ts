/** Допустимые роли аккаунта. */
export const UserRole = {
  user: 'USER',
  admin: 'ADMIN',
  superAdmin: 'SUPER_ADMIN',
} as const;

/** Допустимые роли аккаунта. */
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/** Допустимые статусы аккаунта. */
export const UserStatus = {
  active: 'ACTIVE',
  blocked: 'BLOCKED',
} as const;

/** Допустимые статусы аккаунта. */
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];
