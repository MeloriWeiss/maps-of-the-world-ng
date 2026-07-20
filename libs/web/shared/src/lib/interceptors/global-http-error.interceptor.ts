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
        let message: string;

        if (error.status >= 500) {
          message = `Error 500. Internal Server Error`;
        } else {
          const backendMessage = error.error.message ?? error.message;
          const statusCode = error.error.statusCode ?? error.status;

          message = `Error ${statusCode}. ${backendMessage}`;
        }

        toastService.show(ErrorToastComponent, { message: message });
      }

      return throwError(() => error);
    }),
  );
};
