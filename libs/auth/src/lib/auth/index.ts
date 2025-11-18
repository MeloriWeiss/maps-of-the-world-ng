import { canActivateNonAuth } from './access-forward.guard';
import { canActivateAuth } from "./access.guard";

export {
  canActivateAuth,
  canActivateNonAuth,
}
