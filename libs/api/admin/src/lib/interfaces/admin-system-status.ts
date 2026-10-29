/** Состояние доступности ресурса API. */
export type SystemResourceStatus = 'available' | 'unavailable';

/** Результат проверки доступности ресурса и времени ответа. */
export interface SystemResourceCheck {
  status: SystemResourceStatus;
  responseTimeMs: number;
}
