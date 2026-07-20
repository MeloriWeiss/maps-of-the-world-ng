import { HttpContextToken } from '@angular/common/http';

export const BYPASS_GLOBAL_ERROR = new HttpContextToken<boolean>(() => false);
