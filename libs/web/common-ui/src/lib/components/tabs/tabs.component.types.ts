/** Вкладка с устойчивым идентификатором и необязательной ссылкой маршрутизатора. */
export interface TabItem {
  readonly id: string;
  readonly label: string;
  readonly routerLink?: string | unknown[];
}
