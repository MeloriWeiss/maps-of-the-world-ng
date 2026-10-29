import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { UserRole } from '@wm/shared/users';
import { CurrentAccountStore } from '@wm/web/data-access/profile';
import { canActivateAdmin } from './admin.guard';

describe('canActivateAdmin', () => {
  const createUrlTree = jest.fn(() => 'home-url-tree');
  const user = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: CurrentAccountStore, useValue: { user } },
        { provide: Router, useValue: { createUrlTree } },
      ],
    });
  });

  it.each([UserRole.admin, UserRole.superAdmin])(
    'allows the %s role',
    (role) => {
      user.mockReturnValue({ role });

      expect(runGuard()).toBe(true);
      expect(createUrlTree).not.toHaveBeenCalled();
    },
  );

  it('redirects a regular user to the home page', () => {
    user.mockReturnValue({ role: UserRole.user });

    expect(runGuard()).toBe('home-url-tree');
    expect(createUrlTree).toHaveBeenCalledWith(['/home']);
  });

  const runGuard = () =>
    TestBed.runInInjectionContext(() =>
      canActivateAdmin({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
});
