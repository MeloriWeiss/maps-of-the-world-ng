import type { ChartConfiguration } from 'chart.js';
import type {
  AdminDashboardDto,
  AdminUserAnalyticsDto,
} from '@wm/web/data-access/admin';
import type { ActivityChartColors } from './dashboard.component.types';
import { formatChartDate } from './dashboard-format.utils';

/** Подготавливает данные распределения контента для круговой диаграммы. */
export function toDashboardChartData(
  dashboard: AdminDashboardDto,
  colors: string[],
): ChartConfiguration<'doughnut'>['data'] {
  return {
    labels: ['Карты', 'Наборы текстур', 'Темы форума'],
    datasets: [
      {
        data: [dashboard.maps, dashboard.texturePacks, dashboard.discussions],
        backgroundColor: colors,
        borderWidth: 0,
      },
    ],
  };
}

/** Преобразует временной ряд посещений и регистраций в серии линейной диаграммы. */
export function toActivityChartData(
  analytics: AdminUserAnalyticsDto,
  colors: ActivityChartColors,
): ChartConfiguration<'line'>['data'] {
  return {
    labels: analytics.series.map((item) =>
      formatChartDate(item.from, analytics.period.interval),
    ),
    datasets: [
      {
        label: 'Посещения',
        data: analytics.series.map((item) => item.visits),
        borderColor: colors.visitsColor,
        backgroundColor: colors.backgroundColor,
        tension: 0.25,
      },
      {
        label: 'Уникальные посетители',
        data: analytics.series.map((item) => item.uniqueVisitors),
        borderColor: colors.uniqueVisitorsColor,
        backgroundColor: colors.backgroundColor,
        tension: 0.25,
      },
      {
        label: 'Регистрации',
        data: analytics.series.map((item) => item.registrations),
        borderColor: colors.registrationsColor,
        backgroundColor: colors.backgroundColor,
        tension: 0.25,
      },
    ],
  };
}
