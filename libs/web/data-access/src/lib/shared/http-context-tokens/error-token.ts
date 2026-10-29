import { HttpContextToken } from '@angular/common/http';

/** HTTP-контекстный токен для отключения общего обработчика ошибки. */
export const BYPASS_GLOBAL_ERROR = new HttpContextToken<boolean>(() => false);
