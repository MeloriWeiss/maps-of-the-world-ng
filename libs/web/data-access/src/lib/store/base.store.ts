import { Signal, signal, WritableSignal } from '@angular/core';

export abstract class BaseStore<State extends object> {
  readonly #initialState: State;
  readonly #writableState: WritableSignal<State>;
  readonly state: Signal<State>;

  protected constructor(initialState: State) {
    this.#initialState = initialState;
    this.#writableState = signal(initialState);
    this.state = this.#writableState.asReadonly();
  }

  protected patchState(
    patch: Partial<State> | ((state: State) => Partial<State>),
  ) {
    this.#writableState.update((state) => ({
      ...state,
      ...(typeof patch === 'function' ? patch(state) : patch),
    }));
  }

  protected resetState() {
    this.#writableState.set(this.#initialState);
  }
}
