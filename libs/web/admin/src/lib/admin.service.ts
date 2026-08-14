import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_CONFIG } from '@wm/web/data-access/shared';
import { UserRoleType, UserStatusType } from '@wm/shared/users';
import {
  AdminDashboardDto,
  AdminDiscussionDto,
  AdminAuditDto,
  AdminMapDto,
  AdminPageDto,
  AdminTexturePackDto,
  AdminUserDto,
  AdminUsersPageDto,
  AdminUserAnalyticsDto,
  AnalyticsInterval,
  AdminAuditFilters,
  AdminContentFilters,
  AdminSystemStatusDto,
} from './admin.models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  readonly #http = inject(HttpClient);
  readonly #apiConfig = inject(API_CONFIG);
  readonly #baseUrl = `${this.#apiConfig.baseUrl}admin`;

  getDashboard() {
    return this.#http.get<AdminDashboardDto>(`${this.#baseUrl}/dashboard`);
  }

  getSystemStatus() {
    return this.#http.get<AdminSystemStatusDto>(
      `${this.#baseUrl}/system-status`,
    );
  }

  getUserAnalytics(from: Date, to: Date, interval: AnalyticsInterval) {
    const params = new HttpParams()
      .set('from', from.toISOString())
      .set('to', to.toISOString())
      .set('interval', interval);
    return this.#http.get<AdminUserAnalyticsDto>(
      `${this.#baseUrl}/user-analytics`,
      { params },
    );
  }

  getUsers(search = '', page = 1) {
    let params = new HttpParams().set('page', page);
    if (search) params = params.set('search', search);
    return this.#http.get<AdminUsersPageDto>(`${this.#baseUrl}/users`, {
      params,
    });
  }

  getMaps(page = 1, filters?: AdminContentFilters) {
    return this.#http.get<AdminPageDto<AdminMapDto>>(`${this.#baseUrl}/maps`, {
      params: this.#contentParams(page, filters, true, false),
    });
  }

  getTexturePacks(page = 1, filters?: AdminContentFilters) {
    return this.#http.get<AdminPageDto<AdminTexturePackDto>>(
      `${this.#baseUrl}/texture-packs`,
      { params: this.#contentParams(page, filters, true, false) },
    );
  }

  getDiscussions(page = 1, filters?: AdminContentFilters) {
    return this.#http.get<AdminPageDto<AdminDiscussionDto>>(
      `${this.#baseUrl}/forum-discussions`,
      { params: this.#contentParams(page, filters, false, true) },
    );
  }

  getAudit(page = 1, filters?: AdminAuditFilters) {
    let params = new HttpParams().set('page', page);
    if (filters?.actor.trim())
      params = params.set('actor', filters.actor.trim());
    if (filters?.action) params = params.set('action', filters.action);
    if (filters?.targetType)
      params = params.set('targetType', filters.targetType);
    if (filters?.targetId.trim())
      params = params.set('targetId', filters.targetId.trim());
    if (filters?.from)
      params = params.set(
        'from',
        new Date(`${filters.from}T00:00:00Z`).toISOString(),
      );
    if (filters?.to) {
      const to = new Date(`${filters.to}T00:00:00Z`);
      to.setUTCDate(to.getUTCDate() + 1);
      params = params.set('to', to.toISOString());
    }
    return this.#http.get<AdminPageDto<AdminAuditDto>>(
      `${this.#baseUrl}/audit`,
      { params },
    );
  }

  updateMapVisibility(id: number, isHidden: boolean) {
    return this.#http.patch<{ id: string; isHidden: boolean }>(
      `${this.#baseUrl}/maps/${id}/visibility`,
      { isHidden },
    );
  }

  updateTexturePackVisibility(id: string, isHidden: boolean) {
    return this.#http.patch<{ id: string; isHidden: boolean }>(
      `${this.#baseUrl}/texture-packs/${id}/visibility`,
      { isHidden },
    );
  }

  updateDiscussionVisibility(id: number, isHidden: boolean) {
    return this.#http.patch<{ id: string; isHidden: boolean }>(
      `${this.#baseUrl}/forum-discussions/${id}/visibility`,
      { isHidden },
    );
  }

  updateRole(id: number, role: UserRoleType) {
    return this.#http.patch<Pick<AdminUserDto, 'id' | 'role' | 'status'>>(
      `${this.#baseUrl}/users/${id}/role`,
      { role },
    );
  }

  updateStatus(id: number, status: UserStatusType) {
    return this.#http.patch<Pick<AdminUserDto, 'id' | 'role' | 'status'>>(
      `${this.#baseUrl}/users/${id}/status`,
      { status },
    );
  }

  #contentParams(
    page: number,
    filters: AdminContentFilters | undefined,
    includePublication: boolean,
    includeCategory: boolean,
  ) {
    let params = new HttpParams().set('page', page);
    if (!filters) return params;
    if (filters.search.trim())
      params = params.set('search', filters.search.trim());
    if (filters.author.trim())
      params = params.set('author', filters.author.trim());
    if (filters.visibility)
      params = params.set('visibility', filters.visibility);
    if (includePublication && filters.publication)
      params = params.set('publication', filters.publication);
    if (includeCategory && filters.category.trim())
      params = params.set('category', filters.category.trim());
    return params;
  }
}
