import { CommonModule, DatePipe, NgFor } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '../../core/lang/translate.pipe';
import { Person } from '../../domain/person';
import { ReportsService } from '../../endpoint/reports.serivce';
import {
  BehaviorSubject,
  combineLatest,
  filter,
  map,
  shareReplay,
  switchMap,
} from 'rxjs';
import { EmailsService } from '../../endpoint/emails.service';

@Component({
  selector: 'app-recent-client-reports',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
    DatePipe,
    NgFor,
  ],
  template: `
    <table
      mat-table
      [dataSource]="(grouped$ | async) || []"
      style="width: 100%"
    >
      <ng-container matColumnDef="period">
        <th mat-header-cell *matHeaderCellDef>{{ 'date' | translate }}</th>
        <td mat-cell *matCellDef="let g">
          {{ g.periodDate | date: 'yyyy' }} {{ g.month | translate }}
        </td>
      </ng-container>
      <ng-container matColumnDef="count">
        <th mat-header-cell *matHeaderCellDef>#</th>
        <td mat-cell *matCellDef="let g">
          {{ g.sentDate | date: 'dd/MM/yyyy HH:mm' }}
        </td>
      </ng-container>
      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef>{{ 'actions' | translate }}</th>
        <td mat-cell *matCellDef="let g">
          <button
            mat-icon-button
            aria-label="Preview"
            (click)="openPreviewGroup(g)"
          >
            <mat-icon style="color: #2196F3;">visibility</mat-icon>
          </button>
        </td>
      </ng-container>
      <tr mat-header-row *matHeaderRowDef="['period', 'count', 'actions']"></tr>
      <tr
        mat-row
        *matRowDef="let row; columns: ['period', 'count', 'actions']"
      ></tr>
    </table>
  `,
})
export class RecentClientReportsComponent {
  private client$ = new BehaviorSubject<Person | null>(null);
  @Input() set client(value: Person | null) {
    this.client$.next(value || null);
    this.currentClientId = value?._id || undefined;
  }

  private reports = inject(ReportsService);
  private emails = inject(EmailsService);
  private currentClientId?: string;

  private toEpochMs(value: unknown): number | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    if (value instanceof Date) {
      return value.getTime();
    }

    // Handle Firestore Timestamp-like objects { seconds, nanoseconds }.
    if (typeof value === 'object') {
      const seconds = (value as { seconds?: unknown }).seconds;
      if (typeof seconds === 'number' && Number.isFinite(seconds)) {
        return seconds * 1000;
      }
      return undefined;
    }

    const raw = Number(value);
    if (!Number.isFinite(raw)) {
      return undefined;
    }

    // Normalize seconds / milliseconds / microseconds to milliseconds.
    if (raw < 1e11) {
      return raw * 1000;
    }
    if (raw > 1e14) {
      return Math.floor(raw / 1000);
    }
    return raw;
  }

  private reportKey(
    clientId: string | undefined,
    dateValue: unknown,
    isAnnual: boolean
  ): string | undefined {
    if (!clientId) {
      return undefined;
    }

    const ms = this.toEpochMs(dateValue);
    if (!ms) {
      return undefined;
    }

    const d = new Date(ms);
    const y = d.getUTCFullYear();
    const m = isAnnual ? 0 : d.getUTCMonth();
    return [clientId, y, m, isAnnual ? 'A' : 'M'].join('_');
  }

  rows$ = this.client$.pipe(
    filter((c): c is Person => !!c && !!c._id),
    switchMap((client) => this.reports.getForClientFromYearStart(client._id)),
    shareReplay({ refCount: true, bufferSize: 1 })
  );

  private recentEmails$ = this.emails.getNewestEmails(300).pipe(
    shareReplay({ refCount: true, bufferSize: 1 })
  );

  grouped$ = combineLatest([this.rows$, this.recentEmails$, this.client$]).pipe(
    map(([items, emails, client]) => {
      const clientId = client?._id || this.currentClientId;
      const sentByReportKey: Record<string, number> = {};

      (emails || []).forEach((email) => {
        const emailClientId =
          (email as any)?.template?.data?.clientId ||
          (Array.isArray(email.toUids) ? email.toUids[0] : undefined);
        const reportDate = (email as any)?.template?.data?.date;
        const isAnnual = (email as any)?.template?.name === 'annualReport';
        const sentAt = this.toEpochMs(email?.delivery?.startTime);
        const key = this.reportKey(emailClientId, reportDate, isAnnual);

        if (!key || !sentAt) {
          return;
        }
        sentByReportKey[key] = Math.max(sentByReportKey[key] || 0, sentAt);
      });

      const groups = new Map<string, any[]>();
      for (const r of items) {
        const parts = (r?.id || '').split('_');
        const key = parts.length >= 2 ? `${parts[0]}_${parts[1]}` : 'unknown';
        const list = groups.get(key) || [];
        list.push(r);
        groups.set(key, list);
      }
      return Array.from(groups.entries())
        .map(([key, list]) => {
          const sorted = list.sort((a: any, b: any) => b.date - a.date);
          const [yearStr, monthStr] = key.split('_');
          const year = Number(yearStr);
          const month = Number(monthStr);
          const monthKey = `months.${month}`;
          const periodDate = new Date(Date.UTC(year, month, 1));
          const latest = sorted[0];
          const reportDate = this.toEpochMs(latest?.date) || latest?.date;
          const isAnnual = !!latest?.isAnnual;
          const sentKey = this.reportKey(clientId, reportDate, isAnnual);
          const sentDate =
            (sentKey && sentByReportKey[sentKey]) ||
            this.toEpochMs(reportDate) ||
            reportDate;
          return {
            key,
            items: sorted,
            date: reportDate,
            sentDate,
            isAnnual,
            month: monthKey,
            periodDate,
          };
        })
        .sort((a, b) => (b.sentDate || b.date) - (a.sentDate || a.date));
    })
  );

  openPreviewGroup(group: {
    key: string;
    items: any[];
    date: number;
    isAnnual: boolean;
  }) {
    const top = group.items[0];
    this.openPreview(top);
  }

  private buildDocId(
    clientId: string,
    date: number,
    isAnnual: boolean
  ): string {
    const tags = [clientId, date];
    if (isAnnual) {
      tags.push('A');
    }
    return tags.join('_');
  }

  openPreview(row: any) {
    const clientId = this.currentClientId || row?.client?.id;
    const docId = this.buildDocId(clientId, row?.date, !!row?.isAnnual);
    const url = `${window.location.origin}/report-preview/${docId}`;
    window.open(
      url,
      'targetWindow',
      'toolbar=no, location=no, status=no, menubar=no, scrollbars=yes, resizable=no, width=794, height=1123'
    );
  }
}
