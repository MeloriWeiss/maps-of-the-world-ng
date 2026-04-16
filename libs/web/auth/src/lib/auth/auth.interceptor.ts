import {
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import {
  BehaviorSubject,
  catchError,
  filter,
  finalize,
  switchMap,
  take,
  throwError,
} from 'rxjs';
import { AuthService } from '@wm/web/data-access/auth';

const isRefreshing$ = new BehaviorSubject<boolean>(false);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  const apiReq = req.clone({
    withCredentials: true,
  });

  if (apiReq.url.includes('/refresh')) {
    return next(apiReq);
  }

  if (isRefreshing$.value) {
    return waitForRefreshAndRetry(apiReq, next);
  }

  return next(apiReq).pipe(
    catchError((error) => {
      if (error.status === 401) {
        return refreshAndProceed(authService, apiReq, next);
      }
      return throwError(() => error);
    }),
  );
};

const refreshAndProceed = (
  authService: AuthService,
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  if (isRefreshing$.value) {
    return waitForRefreshAndRetry(req, next);
  }

  isRefreshing$.next(true);

  return authService.refresh().pipe(
    switchMap(() => next(req)),
    finalize(() => {
      isRefreshing$.next(false);
    }),
  );
};

const waitForRefreshAndRetry = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  return isRefreshing$.pipe(
    filter((isRefreshing) => !isRefreshing),
    take(1),
    switchMap(() => next(req)),
  );
};
