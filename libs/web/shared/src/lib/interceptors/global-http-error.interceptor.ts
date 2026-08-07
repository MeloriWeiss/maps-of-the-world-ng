import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { inject } from '@angular/core';
import { ErrorToastComponent, ToastService } from '@wm/web/common-ui';
import { BYPASS_GLOBAL_ERROR } from '@wm/web/data-access/shared';

export const globalHttpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const bypassGlobal = req.context.get(BYPASS_GLOBAL_ERROR);

      if (!bypassGlobal) {
        let message = error.error.message ?? error.message;
        const statusCode = error.error.statusCode ?? error.status;

        switch (statusCode) {
          case 502:
          case 503:
          case 504:
            message = 'Сервис временно недоступен. Попробуйте позже';
            break;
          case 413:
            message = 'Размер загружаемого файла слишком большой';
            break;
        }

        toastService.show(ErrorToastComponent, { message: message });
      }

      return throwError(() => error);
    }),
  );
};
