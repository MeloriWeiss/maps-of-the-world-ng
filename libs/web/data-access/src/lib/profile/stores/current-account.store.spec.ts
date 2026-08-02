import { TestBed } from '@angular/core/testing';
import { ProfileSummaryDto } from '@wm/shared/accounts';
import { UserResponseDto } from '@wm/shared/users';
import { Subject } from 'rxjs';
import { ProfileService } from '../services';
import { CurrentAccountStore } from './current-account.store';

describe('CurrentAccountStore', () => {
  it('keeps the active profile request when the same user is authenticated again', () => {
    const profileRequest = new Subject<ProfileSummaryDto>();
    const profileService = {
      getProfileSummary: jest.fn(() => profileRequest),
    };
    TestBed.configureTestingModule({
      providers: [
        CurrentAccountStore,
        { provide: ProfileService, useValue: profileService },
      ],
    });
    const store = TestBed.inject(CurrentAccountStore);
    const user: UserResponseDto = {
      id: 1,
      email: 'user@example.com',
      username: 'user',
    };
    const profile: ProfileSummaryDto = {
      nickname: 'User',
      avatarUrl: '/avatar.png',
      bio: null,
      createdAt: '2026-08-01T00:00:00.000Z',
      likesReceived: 0,
      publishedMapsCount: 0,
      publishedTexturePacksCount: 0,
    };

    store.authenticate(user);
    store.authenticate(user);
    profileRequest.next(profile);

    expect(profileService.getProfileSummary).toHaveBeenCalledTimes(1);
    expect(store.profile()).toEqual(profile);
    expect(store.isProfileLoading()).toBe(false);
  });
});
