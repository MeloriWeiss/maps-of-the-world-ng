/** Контекст пользовательского шаблона с индексом элемента в исходном списке. */
export interface VirtualListItemContext<T> {
  $implicit: T;
  index: number;
}

/** Элемент видимой области с сохранённым индексом исходного списка. */
export interface VisibleItem<T> {
  item: T;
  index: number;
}
