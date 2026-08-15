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
import { AdminService } from './admin.service';
import { AdminDashboardDto } from './admin.models';
import { AdminSystemStatusDto } from './admin.models';
import { AdminUserAnalyticsDto, AnalyticsInterval } from './admin.models';
import { ThemeService } from '@wm/web/shared';

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
    from: this.#formatDateInput(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    ),
    to: this.#formatDateInput(new Date()),
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
  // readonly activityChartOptions: ChartConfiguration<'line'>['options'] = {
  //   responsive: true,
  //   maintainAspectRatio: false,
  //   scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
  // };

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
          this.uptimeLabel.set(this.#formatUptime(status.uptimeSeconds));
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
          this.chartData.set({
            labels: ['Карты', 'Наборы текстур', 'Темы форума'],
            datasets: [
              {
                data: [
                  dashboard.maps,
                  dashboard.texturePacks,
                  dashboard.discussions,
                ],
                backgroundColor: [mapsColor, texturesColor, discussionsColor],
                borderWidth: 0,
              },
            ],
          });
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
      from: this.#formatDateInput(from),
      to: this.#formatDateInput(to),
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
              : `Для выбранного периода шаг автоматически увеличен до «${this.#intervalLabel(effectiveInterval)}».`,
          );
          this.activityChartData.set({
            labels: analytics.series.map((item) =>
              this.#formatChartDate(item.from, effectiveInterval),
            ),
            datasets: [
              {
                label: 'Посещения',
                data: analytics.series.map((item) => item.visits),
                borderColor: visitsColor,
                backgroundColor: 'transparent',
                tension: 0.25,
              },
              {
                label: 'Уникальные посетители',
                data: analytics.series.map((item) => item.uniqueVisitors),
                borderColor: uniqueVisitorsColor,
                backgroundColor: 'transparent',
                tension: 0.25,
              },
              {
                label: 'Регистрации',
                data: analytics.series.map((item) => item.registrations),
                borderColor: registrationsColor,
                backgroundColor: 'transparent',
                tension: 0.25,
              },
            ],
          });
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

  #formatDateInput(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  #formatChartDate(value: string, interval: AnalyticsInterval) {
    const options: Intl.DateTimeFormatOptions =
      interval === 'hour'
        ? { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }
        : interval === 'month'
          ? { month: 'short', year: 'numeric' }
          : interval === 'year'
            ? { year: 'numeric' }
            : { day: '2-digit', month: 'short', year: 'numeric' };
    return new Intl.DateTimeFormat('ru-RU', options).format(new Date(value));
  }

  #intervalLabel(interval: AnalyticsInterval) {
    const labels: Record<AnalyticsInterval, string> = {
      hour: 'час',
      day: 'день',
      week: 'неделя',
      month: 'месяц',
      year: 'год',
    };
    return labels[interval];
  }

  #getCssColor(variable: string) {
    const view = this.#document.defaultView;
    if (!view) return '';
    return view
      .getComputedStyle(this.#document.documentElement)
      .getPropertyValue(variable)
      .trim();
  }

  #formatUptime(totalSeconds: number) {
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return [days && `${days} д.`, hours && `${hours} ч.`, `${minutes} мин.`]
      .filter(Boolean)
      .join(' ');
  }
}
