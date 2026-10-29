import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { DatePipe, DOCUMENT } from '@angular/common';
import { SelectComponent, SelectOptionComponent } from '@wm/web/common-ui';
import { AdminService } from '@wm/web/data-access/admin';
import type {
  AdminDashboardDto,
  AdminSystemStatusDto,
  AdminUserAnalyticsDto,
  AnalyticsInterval,
} from '@wm/web/data-access/admin';
import { ThemeService } from '@wm/web/shared';
import {
  toDashboardChartData,
  toActivityChartData,
} from './dashboard-chart.mapper';
import {
  formatDateInput,
  intervalLabel,
  formatUptime,
} from './dashboard-format.utils';

/** Показывает состояние системы, сводные показатели и графики активности. */
@Component({
  selector: 'wm-admin-dashboard',
  imports: [
    BaseChartDirective,
    ReactiveFormsModule,
    SelectComponent,
    SelectOptionComponent,
    DatePipe,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  readonly #adminService = inject(AdminService);
  readonly #themeService = inject(ThemeService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #formBuilder = inject(NonNullableFormBuilder);
  readonly #document = inject(DOCUMENT);
  readonly dashboard = signal<AdminDashboardDto | null>(null);
  readonly isLoading = signal(true);
  readonly dashboardError = signal<string | null>(null);
  readonly systemStatus = signal<AdminSystemStatusDto | null>(null);
  readonly systemStatusLoading = signal(false);
  readonly systemStatusError = signal<string | null>(null);
  readonly uptimeLabel = signal('');
  readonly analytics = signal<AdminUserAnalyticsDto | null>(null);
  readonly analyticsLoading = signal(false);
  readonly analyticsError = signal<string | null>(null);
  readonly intervalNotice = signal<string | null>(null);
  readonly selectedPeriod = signal(30);
  readonly periodForm = this.#formBuilder.group({
    from: formatDateInput(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
    to: formatDateInput(new Date()),
    interval: this.#formBuilder.control<AnalyticsInterval>('day'),
  });
  readonly chartData = signal<ChartConfiguration<'doughnut'>['data']>({
    labels: [],
    datasets: [],
  });
  readonly activityChartData = signal<ChartConfiguration<'line'>['data']>({
    labels: [],
    datasets: [],
  });
  readonly activityChartOptions = computed<ChartOptions<'line'>>(() => {
    this.#themeService.currentTheme();

    const textColor = this.#getCssColor('--text-muted-color') || '#747474';
    const gridColor = this.#getCssColor('--border-popover-color') || '#e9e6e3';

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: textColor,
            font: { family: 'inherit', size: 13, weight: 'bold' },
          },
        },
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor },
        },
        y: {
          beginAtZero: true,
          grid: { color: gridColor },
          ticks: { color: textColor, precision: 0 },
        },
      },
    };
  });

  readonly doughnutChartOptions = computed<ChartOptions<'doughnut'>>(() => {
    this.#themeService.currentTheme();
    const textColor = this.#getCssColor('--text-primary-color') || '#000000';

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: textColor,
            font: { family: 'inherit', size: 14, weight: 'bold' },
            padding: 16,
          },
        },
      },
    };
  });

  constructor() {
    this.loadDashboard();
    this.loadSystemStatus();
    this.selectPeriod(30);
  }

  loadSystemStatus() {
    this.systemStatusLoading.set(true);
    this.systemStatusError.set(null);

    this.#adminService
      .getSystemStatus()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (status) => {
          this.systemStatus.set(status);
          this.uptimeLabel.set(formatUptime(status.uptimeSeconds));
          this.systemStatusLoading.set(false);
        },
        error: () => {
          this.systemStatusError.set('Не удалось проверить состояние системы.');
          this.systemStatusLoading.set(false);
        },
      });
  }

  loadDashboard() {
    this.isLoading.set(true);
    this.dashboardError.set(null);

    this.#adminService
      .getDashboard()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (dashboard) => {
          const mapsColor =
            this.#getCssColor('--accent-main-color') || '#948d81';
          const texturesColor = this.#getCssColor('--cyan-color') || '#366bbe';
          const discussionsColor =
            this.#getCssColor('--purple-color') || '#7f5af0';

          this.dashboard.set(dashboard);
          this.chartData.set(
            toDashboardChartData(dashboard, [
              mapsColor,
              texturesColor,
              discussionsColor,
            ]),
          );
          this.isLoading.set(false);
        },
        error: () => {
          this.dashboardError.set('Не удалось загрузить общую статистику.');
          this.isLoading.set(false);
        },
      });
  }

  selectPeriod(days: number) {
    this.selectedPeriod.set(days);

    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
    const interval: AnalyticsInterval = days === 1 ? 'hour' : 'day';

    this.periodForm.setValue({
      from: formatDateInput(from),
      to: formatDateInput(to),
      interval,
    });

    this.#loadAnalytics(from, to, interval);
  }

  applyCustomPeriod() {
    const { from, to, interval } = this.periodForm.getRawValue();
    const fromDate = new Date(`${from}T00:00:00`);
    const toDate = new Date(`${to}T00:00:00`);
    toDate.setDate(toDate.getDate() + 1);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()))
      return;

    this.selectedPeriod.set(0);
    this.#loadAnalytics(fromDate, toDate, interval);
  }

  selectInterval(interval: string) {
    if (
      interval !== 'hour' &&
      interval !== 'day' &&
      interval !== 'week' &&
      interval !== 'month' &&
      interval !== 'year'
    )
      return;

    this.periodForm.controls.interval.setValue(interval);
  }

  #loadAnalytics(from: Date, to: Date, interval: AnalyticsInterval) {
    const visitsColor = this.#getCssColor('--cyan-color') || '#16b7ff';
    const uniqueVisitorsColor = this.#getCssColor('--green-color') || '#27914d';
    const registrationsColor = this.#getCssColor('--purple-color') || '#7f5af0';

    this.analyticsLoading.set(true);
    this.analyticsError.set(null);

    this.#adminService
      .getUserAnalytics(from, to, interval)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (analytics) => {
          this.analytics.set(analytics);
          const effectiveInterval = analytics.period.interval;
          this.intervalNotice.set(
            effectiveInterval === interval
              ? null
              : `Для выбранного периода шаг автоматически увеличен до «${intervalLabel(effectiveInterval)}».`,
          );
          this.activityChartData.set(
            toActivityChartData(analytics, {
              visitsColor,
              uniqueVisitorsColor,
              registrationsColor,
              backgroundColor: 'transparent',
            }),
          );
          this.analyticsLoading.set(false);
        },
        error: () => {
          this.intervalNotice.set(null);
          this.analyticsError.set(
            'Не удалось загрузить данные за выбранный период.',
          );
          this.analyticsLoading.set(false);
        },
      });
  }

  #getCssColor(variable: string) {
    const view = this.#document.defaultView;
    if (!view) return '';
    return view
      .getComputedStyle(this.#document.documentElement)
      .getPropertyValue(variable)
      .trim();
  }
}
