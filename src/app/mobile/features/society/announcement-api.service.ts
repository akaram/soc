import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ModuleRecordService, SocietyModuleRecordRow } from '../../../core/services/module-record.service';

export interface AnnouncementRow {
  id: string;
  title: string;
  message: string;
  date: Date;
  category?: string;
}

/** Card shape for dashboard Community Updates section. */
export interface CommunityUpdateCard {
  id: string;
  icon: string;
  iconColor: string;
  title: string;
  message: string;
  time: string;
}

/** Mobile announcements backed by /module-records?moduleCode=ANNOUNCEMENT */
@Injectable({ providedIn: 'root' })
export class AnnouncementApiService {
  private static readonly MODULE = 'ANNOUNCEMENT';

  constructor(private moduleRecords: ModuleRecordService) {}

  listForSociety(societyId: string): Observable<AnnouncementRow[]> {
    return this.moduleRecords.list(societyId, AnnouncementApiService.MODULE).pipe(
      map(rows =>
        (rows ?? [])
          .filter(r => (r.status ?? '').toUpperCase() !== 'DRAFT')
          .map(r => this.normalize(r))
      )
    );
  }

  /** Latest announcements for the dashboard Community Updates strip. */
  listDashboardUpdates(societyId: string, limit = 5): Observable<CommunityUpdateCard[]> {
    return this.listForSociety(societyId).pipe(
      map(rows =>
        [...rows]
          .sort((a, b) => b.date.getTime() - a.date.getTime())
          .slice(0, limit)
          .map(row => this.toCommunityCard(row))
      )
    );
  }

  private toCommunityCard(row: AnnouncementRow): CommunityUpdateCard {
    const visual = this.categoryVisual(row.category);
    return {
      id: row.id,
      icon: visual.icon,
      iconColor: visual.iconColor,
      title: row.title,
      message: row.message,
      time: this.formatRelativeTime(row.date)
    };
  }

  /** Map announcement category to dashboard icon styling. */
  private categoryVisual(category?: string): { icon: string; iconColor: string } {
    const key = (category ?? 'General').toLowerCase();
    if (key.includes('event') || key.includes('celebration')) {
      return { icon: 'celebration', iconColor: '#f093fb' };
    }
    if (key.includes('meeting') || key.includes('agm')) {
      return { icon: 'how_to_vote', iconColor: '#4facfe' };
    }
    if (key.includes('maintenance') || key.includes('water')) {
      return { icon: 'build', iconColor: '#667eea' };
    }
    if (key.includes('emergency')) {
      return { icon: 'emergency', iconColor: '#ff6b6b' };
    }
    return { icon: 'campaign', iconColor: '#667eea' };
  }

  /** Human-readable relative time for announcement cards. */
  private formatRelativeTime(date: Date): string {
    if (!date || date.getTime() <= 0) {
      return 'Recently';
    }
    const diffMs = Date.now() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  private normalize(raw: SocietyModuleRecordRow): AnnouncementRow {
    const category = raw.status && raw.status !== 'OPEN' ? raw.status : undefined;
    return {
      id: raw.id,
      title: raw.title,
      message: raw.body ?? '',
      date: raw.createdAt ? new Date(raw.createdAt) : new Date(0),
      category
    };
  }
}
