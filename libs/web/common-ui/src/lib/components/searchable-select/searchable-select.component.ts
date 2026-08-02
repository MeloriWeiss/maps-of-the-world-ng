import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { ClickOutsideDirective } from '../../directives';

let searchableSelectId = 0;

export interface SearchableSelectOption<T> {
  value: T;
  label: string;
  description?: string;
}

@Component({
  selector: 'wm-searchable-select',
  imports: [ClickOutsideDirective],
  templateUrl: './searchable-select.component.html',
  styleUrl: './searchable-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchableSelectComponent<T> {
  readonly optionsId = `searchable-select-options-${searchableSelectId++}`;
  options = input.required<readonly SearchableSelectOption<T>[]>();
  value = input<T | null>(null);
  placeholder = input('Выберите элемент');
  searchPlaceholder = input('Поиск');
  emptyText = input('Ничего не найдено');
  ariaLabel = input('Выбрать элемент');
  disabled = input(false);
  valueChange = output<T>();

  isOpen = signal(false);
  searchQuery = signal('');
  activeIndex = signal(-1);

  selectedOption = computed(() =>
    this.options().find((option) => Object.is(option.value, this.value())),
  );
  filteredOptions = computed(() => {
    const query = this.searchQuery().trim().toLocaleLowerCase();
    if (!query) return this.options();
    return this.options().filter((option) =>
      `${option.label} ${option.description ?? ''}`
        .toLocaleLowerCase()
        .includes(query),
    );
  });

  toggle() {
    if (this.disabled()) return;
    if (this.isOpen()) {
      this.close();
      return;
    }
    this.open();
  }

  open() {
    if (this.disabled()) return;
    this.isOpen.set(true);
    this.#setSelectedOptionActive();
  }

  close() {
    this.isOpen.set(false);
    this.searchQuery.set('');
    this.activeIndex.set(-1);
  }

  updateSearch(event: Event) {
    const searchInput = event.target;
    if (!(searchInput instanceof HTMLInputElement)) return;
    this.searchQuery.set(searchInput.value);
    this.activeIndex.set(this.filteredOptions().length ? 0 : -1);
  }

  clearSearch() {
    this.searchQuery.set('');
    this.activeIndex.set(this.filteredOptions().length ? 0 : -1);
  }

  select(option: SearchableSelectOption<T>) {
    this.valueChange.emit(option.value);
    this.close();
  }

  handleKeydown(event: KeyboardEvent) {
    if (!this.isOpen()) {
      if (event.key !== 'ArrowDown' && event.key !== 'Enter') return;
      event.preventDefault();
      this.open();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.#moveActiveOption(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (event.key !== 'Enter') return;
    const option = this.filteredOptions()[this.activeIndex()];
    if (!option) return;
    event.preventDefault();
    this.select(option);
  }

  #moveActiveOption(direction: 1 | -1) {
    const optionsCount = this.filteredOptions().length;
    if (!optionsCount) return;
    const nextIndex =
      (this.activeIndex() + direction + optionsCount) % optionsCount;
    this.activeIndex.set(nextIndex);
  }

  #setSelectedOptionActive() {
    const selectedIndex = this.filteredOptions().findIndex((option) =>
      Object.is(option.value, this.value()),
    );
    this.activeIndex.set(selectedIndex >= 0 ? selectedIndex : 0);
  }
}
