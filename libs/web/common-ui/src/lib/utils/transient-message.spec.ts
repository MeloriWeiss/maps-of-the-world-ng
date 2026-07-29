import { TestBed } from '@angular/core/testing';
import { createTransientMessage } from './transient-message';

describe('createTransientMessage', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('clears a message after its duration', () => {
    const message = TestBed.runInInjectionContext(() =>
      createTransientMessage(1_000),
    );

    message.show('Saved');
    jest.advanceTimersByTime(1_000);

    expect(message.value()).toBe('');
  });

  it('restarts the timer when a new message is shown', () => {
    const message = TestBed.runInInjectionContext(() =>
      createTransientMessage(1_000),
    );

    message.show('First');
    jest.advanceTimersByTime(900);
    message.show('Second');
    jest.advanceTimersByTime(900);

    expect(message.value()).toBe('Second');

    jest.advanceTimersByTime(100);
    expect(message.value()).toBe('');
  });

  it('keeps a message when duration is zero', () => {
    const message = TestBed.runInInjectionContext(() =>
      createTransientMessage(1_000),
    );

    message.show('Loading', 0);
    jest.advanceTimersByTime(5_000);

    expect(message.value()).toBe('Loading');
  });
});
