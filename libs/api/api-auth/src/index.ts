import { AccessRequest, OptionalAccessRequest } from './lib/interfaces';
import { JwtAccessGuard, OptionalJwtAccessGuard } from './lib/jwt';
import { Roles, RolesGuard } from './lib/roles';

export * from './lib/api-auth.module';

export { JwtAccessGuard, OptionalJwtAccessGuard, Roles, RolesGuard };
export type { AccessRequest, OptionalAccessRequest };
