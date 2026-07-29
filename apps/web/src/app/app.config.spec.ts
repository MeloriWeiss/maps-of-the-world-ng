import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '@wm/web/data-access/auth';
import { ErrorToastComponent, ToastService } from '@wm/web/common-ui';
import { of } from 'rxjs';
import { appHttpInterceptors } from './app.config';

describe('application HTTP interceptors', () => {
  it('does not show the transient 401 when token refresh recovers the request', () => {
    const toastService = {
      show: jest.fn(),
    };
    const authService = {
      refresh: jest.fn(() => of({})),
    };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors(appHttpInterceptors)),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
        { provide: ToastService, useValue: toastService },
      ],
    });
    const http = TestBed.inject(HttpClient);
    const httpTesting = TestBed.inject(HttpTestingController);

    http.get('/api/protected').subscribe();
    httpTesting
      .expectOne('/api/protected')
      .flush(
        { message: 'Unauthorized' },
        { status: 401, statusText: 'Unauthorized' },
      );
    httpTesting.expectOne('/api/protected').flush({ ok: true });

    expect(authService.refresh).toHaveBeenCalledTimes(1);
    expect(toastService.show).not.toHaveBeenCalledWith(
      ErrorToastComponent,
      expect.objectContaining({ message: 'Unauthorized' }),
    );
    httpTesting.verify();
  });
});
