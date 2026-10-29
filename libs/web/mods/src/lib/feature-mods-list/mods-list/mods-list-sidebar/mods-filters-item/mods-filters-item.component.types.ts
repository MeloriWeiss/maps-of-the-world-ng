/** Дополнительные параметры конкретного фильтра материалов. */
export interface ModsFilterExtra {
  name: string;
  value: string;
  count: number;
  selected: boolean;
}

/** Данные одного фильтра и доступных для него значений. */
export interface ModsFilter {
  name: string;
  value: string;
  count: number;
  extras: ModsFilterExtra[];
}
