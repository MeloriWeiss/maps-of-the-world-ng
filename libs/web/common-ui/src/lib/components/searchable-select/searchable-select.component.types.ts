/** Элемент списка выбора: доменное значение и доступная для поиска подпись. */
export interface SearchableSelectOption<T> {
  value: T;
  label: string;
  description?: string;
}
