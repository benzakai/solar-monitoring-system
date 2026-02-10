import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface EnvDetailSample {
  systemName: string;
  systemId: string;
  systemKwp: number;
  time: number;
  valueKwh: number;
  excludeFromAverage: number | undefined;
}

export interface EnvDetailDialogData {
  monthName: string;
  systemName: string;
  mainSystemKwp: number;
  samples: EnvDetailSample[];
}

interface SystemGroup {
  systemId: string;
  systemName: string;
  systemKwp: number;
  partOfAvg: boolean;
  rows: EnvDetailSample[];
  sumKwh: number;
  sumNorm: number;
  zeroCount: number;
  nonZeroCount: number;
}

@Component({
  selector: 'app-env-detail-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      Environment Detail — {{ data.systemName }} — {{ data.monthName }}
      <span class="systems-count">({{ groups.length }} systems)</span>
    </h2>
    <mat-dialog-content class="dialog-content">

      <div class="global-summary">
        <h3 class="summary-title">Global Summary ({{ groups.length }} systems, main KWP: {{ formatNum(data.mainSystemKwp, 1) }})</h3>
        <div class="summary-table">
          <div class="sum-header">
            <span class="sum-cell head">System</span>
            <span class="sum-cell head">KWP</span>
            <span class="sum-cell head">Part of Avg</span>
            <span class="sum-cell head">Sum kWh</span>
            <span class="sum-cell head">Sum kWh / KWP</span>
          </div>
          @for (g of groups; track g.systemId) {
            <div class="sum-row">
              <span class="sum-cell">{{ g.systemName }}</span>
              <span class="sum-cell num">{{ formatNum(g.systemKwp, 1) }}</span>
              <span class="sum-cell" [class.part-yes]="g.partOfAvg" [class.part-no]="!g.partOfAvg">{{ g.partOfAvg ? 'Yes' : 'No' }}</span>
              <span class="sum-cell num">{{ formatNum(g.sumKwh, 2) }}</span>
              <span class="sum-cell num">{{ formatNum(g.sumNorm, 4) }}</span>
            </div>
          }
          <div class="sum-row sum-total">
            <span class="sum-cell"><strong>Total</strong></span>
            <span class="sum-cell"></span>
            <span class="sum-cell"></span>
            <span class="sum-cell num"><strong>{{ formatNum(totalKwh, 2) }}</strong></span>
            <span class="sum-cell num"><strong>{{ formatNum(totalNorm, 4) }}</strong></span>
          </div>
          <div class="sum-row sum-mean">
            <span class="sum-cell"><strong>Simple Mean (÷ {{ groups.length }})</strong></span>
            <span class="sum-cell"></span>
            <span class="sum-cell"></span>
            <span class="sum-cell num"><strong>{{ formatNum(meanKwh, 2) }}</strong></span>
            <span class="sum-cell num"><strong>{{ formatNum(meanNorm, 4) }}</strong></span>
          </div>
          <div class="sum-row sum-perday">
            <span class="sum-cell"><strong>Per-Day Mean (no zeros)</strong></span>
            <span class="sum-cell"></span>
            <span class="sum-cell"></span>
            <span class="sum-cell num"></span>
            <span class="sum-cell num"><strong>{{ formatNum(perDayMeanNorm, 4) }}</strong></span>
          </div>
          <div class="sum-row sum-perday-kwh">
            <span class="sum-cell"><strong>Per-Day Mean x {{ formatNum(data.mainSystemKwp, 1) }} KWP</strong></span>
            <span class="sum-cell"></span>
            <span class="sum-cell"></span>
            <span class="sum-cell num"></span>
            <span class="sum-cell num"><strong>{{ formatNum(perDayMeanKwh, 0) }}</strong></span>
          </div>
        </div>
      </div>

      @for (g of groups; track g.systemId) {
        <div class="system-block">
          <div class="system-header">
            <span class="sys-name">{{ g.systemName }}</span>
            <span class="sys-id">{{ g.systemId }}</span>
            <span class="sys-kwp">{{ formatNum(g.systemKwp, 1) }} kWp</span>
            <span class="sys-avg" [class.part-yes]="g.partOfAvg" [class.part-no]="!g.partOfAvg">
              Part of Avg: {{ g.partOfAvg ? 'Yes' : 'No' }}
            </span>
          </div>
          <div class="sys-table">
            <div class="sys-t-header">
              <span class="sys-t-cell head">Time (raw)</span>
              <span class="sys-t-cell head">Time (UTC)</span>
              <span class="sys-t-cell head">valueKwh</span>
            </div>
            @for (r of g.rows; track $index) {
              <div class="sys-t-row" [class.zero-row]="!r.valueKwh">
                <span class="sys-t-cell mono">{{ r.time }}</span>
                <span class="sys-t-cell">{{ formatUtc(r.time) }}</span>
                <span class="sys-t-cell num" [class.zero-val]="!r.valueKwh">{{ formatNum(r.valueKwh, 3) }}</span>
              </div>
            }
            <div class="sys-t-row sys-t-sum">
              <span class="sys-t-cell"><strong>Sum ({{ g.nonZeroCount }} / {{ g.rows.length }} days, {{ g.zeroCount }} zeros skipped)</strong></span>
              <span class="sys-t-cell"></span>
              <span class="sys-t-cell num"><strong>{{ formatNum(g.sumKwh, 2) }} kWh</strong></span>
            </div>
            <div class="sys-t-row sys-t-norm">
              <span class="sys-t-cell"><strong>Sum / KWP</strong></span>
              <span class="sys-t-cell mono">{{ formatNum(g.sumKwh, 2) }} ÷ {{ formatNum(g.systemKwp, 1) }}</span>
              <span class="sys-t-cell num"><strong>{{ formatNum(g.sumNorm, 4) }} kWh/kWp</strong></span>
            </div>
          </div>
        </div>
      }

    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-title {
      direction: ltr;
      text-align: left;
    }
    .dialog-content {
      direction: ltr;
      text-align: left;
      max-height: calc(100vh - 120px);
      overflow: auto;
      padding: 0 24px 16px;
    }
    .systems-count {
      font-size: 14px;
      color: #888;
      font-weight: 400;
    }

    /* ── Per-system block ── */
    .system-block {
      margin-bottom: 20px;
    }
    .system-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      background: #f5f5f5;
      border-radius: 6px 6px 0 0;
      border: 1px solid #e0e0e0;
      border-bottom: none;
    }
    .sys-name {
      font-weight: 700;
      font-size: 14px;
    }
    .sys-id {
      font-family: monospace;
      font-size: 12px;
      color: #666;
    }
    .sys-kwp {
      font-size: 12px;
      color: #1565c0;
      font-weight: 600;
    }
    .sys-avg {
      font-size: 12px;
      font-weight: 600;
      margin-left: auto;
    }

    /* ── Per-system table ── */
    .sys-table {
      border: 1px solid #e0e0e0;
      border-radius: 0 0 6px 6px;
      overflow: hidden;
    }
    .sys-t-header, .sys-t-row {
      display: grid;
      grid-template-columns: 1fr 1.8fr 1fr;
      padding: 4px 12px;
    }
    .sys-t-header {
      background: #fafafa;
      font-weight: 600;
    }
    .sys-t-row {
      border-top: 1px solid #eee;
    }
    .sys-t-row:hover {
      background: #f9f9f9;
    }
    .sys-t-sum {
      background: #e8f5e9;
    }
    .sys-t-norm {
      background: #e3f2fd;
    }
    .sys-t-cell {
      font-size: 12px;
      padding: 2px 4px;
      text-align: center;
    }
    .sys-t-cell.head {
      font-size: 11px;
      text-transform: uppercase;
      color: #666;
    }
    .sys-t-cell.num {
      font-variant-numeric: tabular-nums;
    }
    .sys-t-cell.mono {
      font-family: monospace;
      font-size: 11px;
    }

    /* ── Global summary ── */
    .global-summary {
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #1565c0;
    }
    .summary-title {
      font-size: 14px;
      font-weight: 700;
      color: #1565c0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 8px 0;
    }
    .summary-table {
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      overflow: hidden;
    }
    .sum-header, .sum-row {
      display: grid;
      grid-template-columns: 1.5fr 0.7fr 0.7fr 1fr 1fr;
      padding: 5px 12px;
    }
    .sum-header {
      background: #f5f5f5;
      font-weight: 600;
    }
    .sum-row {
      border-top: 1px solid #eee;
    }
    .sum-row:hover {
      background: #f9f9f9;
    }
    .sum-total {
      background: #e8f5e9;
    }
    .sum-mean {
      background: #e3f2fd;
      border-top: 2px solid #1565c0;
    }
    .sum-cell {
      font-size: 12px;
      padding: 2px 4px;
      text-align: center;
    }
    .sum-cell.head {
      font-size: 11px;
      text-transform: uppercase;
      color: #666;
    }
    .sum-cell.num {
      font-variant-numeric: tabular-nums;
    }

    .zero-row {
      background: #fff5f5;
    }
    .zero-val {
      color: #c62828;
      font-weight: 600;
    }
    .sum-perday {
      background: #fff8e1;
      border-top: 2px solid #f9a825;
    }
    .sum-perday-kwh {
      background: #e8f5e9;
      border-top: 2px solid #2e7d32;
      font-size: 13px;
    }
    .part-yes {
      color: #2e7d32;
      font-weight: 600;
    }
    .part-no {
      color: #c62828;
      font-weight: 600;
    }
  `],
})
export class EnvDetailDialogComponent {
  data: EnvDetailDialogData = inject(MAT_DIALOG_DATA);

  groups: SystemGroup[] = this.buildGroups();

  private buildGroups(): SystemGroup[] {
    const map = new Map<string, EnvDetailSample[]>();
    for (const s of this.data.samples) {
      if (!map.has(s.systemId)) map.set(s.systemId, []);
      map.get(s.systemId)!.push(s);
    }
    return [...map.entries()]
      .map(([systemId, rows]) => {
        rows.sort((a, b) => a.time - b.time);
        const first = rows[0];
        const nonZero = rows.filter((r) => r.valueKwh && !isNaN(r.valueKwh));
        const sumKwh = nonZero.reduce((acc, r) => acc + r.valueKwh, 0);
        return {
          systemId,
          systemName: first.systemName,
          systemKwp: first.systemKwp,
          partOfAvg: !first.excludeFromAverage,
          rows,
          sumKwh,
          sumNorm: first.systemKwp ? sumKwh / first.systemKwp : 0,
          zeroCount: rows.length - nonZero.length,
          nonZeroCount: nonZero.length,
        };
      })
      .sort((a, b) => (a.systemId < b.systemId ? -1 : a.systemId > b.systemId ? 1 : 0));
  }

  get totalKwh(): number {
    return this.groups.reduce((sum, g) => sum + g.sumKwh, 0);
  }

  get totalNorm(): number {
    return this.groups.reduce((sum, g) => sum + g.sumNorm, 0);
  }

  get meanKwh(): number {
    return this.groups.length ? this.totalKwh / this.groups.length : 0;
  }

  get meanNorm(): number {
    return this.groups.length ? this.totalNorm / this.groups.length : 0;
  }

  /**
   * Per-day mean that matches GetMeanCalculationReport logic:
   * For each day, compute mean of non-zero (valueKwh / KWP) across all systems,
   * then sum those daily means. Uses local-time day grouping to match startOfDay.
   */
  get perDayMeanNorm(): number {
    // Build a map of day → list of (valueKwh / kwp) for non-zero entries
    const dayMap = new Map<number, number[]>();
    for (const g of this.groups) {
      for (const r of g.rows) {
        if (!r.valueKwh || isNaN(r.valueKwh)) continue;
        // Use local-time startOfDay to match EnergyCalc.startOfDay
        const d = new Date(r.time);
        d.setHours(0, 0, 0, 0);
        const dayKey = d.getTime();
        if (!dayMap.has(dayKey)) dayMap.set(dayKey, []);
        dayMap.get(dayKey)!.push(r.valueKwh / g.systemKwp);
      }
    }
    // Sum of per-day means
    let total = 0;
    for (const values of dayMap.values()) {
      const dayMean = values.reduce((a, b) => a + b, 0) / values.length;
      total += dayMean;
    }
    return total;
  }

  /** Per-day mean multiplied by main system KWP → kWh (should match Monthly Breakdown Environment column) */
  get perDayMeanKwh(): number {
    return this.perDayMeanNorm * (this.data.mainSystemKwp || 0);
  }

  formatUtc(value: number): string {
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toISOString().replace('T', ' ').replace('Z', ' UTC');
  }

  formatNum(value: number, digits: number): string {
    if (value === null || value === undefined || isNaN(value)) return '—';
    return Number(value).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    });
  }
}
