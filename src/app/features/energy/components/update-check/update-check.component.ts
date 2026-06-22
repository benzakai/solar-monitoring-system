import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { EnergyService } from '../../../../endpoint/energy.service';
import {
  combineLatest,
  distinctUntilChanged,
  firstValueFrom,
  from,
  map,
  Observable,
  of,
  shareReplay,
  startWith,
  switchMap,
  take,
} from 'rxjs';
import { AsyncPipe, JsonPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SystemApiService } from '../../../systems/system-api.service';
import { System } from '../../../../domain/system';
import {
  EnergyErrorsService,
  EnergyFailureEntry,
  EnergyRunDoc,
} from '../../../../endpoint/energy-error.service';
import { SystemsService } from '../../../../endpoint/systems.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { provideNativeDateAdapter, MatDateFormats } from '@angular/material/core';
import { HeaderPortalRemoteComponent } from '../../../../core/header/header-portal-remote.component';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { doc, Firestore, getDoc } from '@angular/fire/firestore';

type TokenDates = {
  issuedAt: Date;
  expiresAt: Date;
  isExpired: boolean;
};

type SmaTokenInfo = {
  smaUser: string;
  access: TokenDates | null;
  refresh: TokenDates | null;
};

type GlobalView = { kind: 'global' };

type SystemView = {
  kind: 'system';
  systemId: string;
  systemName: string;
  system: System | null;
  smaTokenInfo: SmaTokenInfo | null;
  failuresLoading: boolean;
  failureRows: EnergyFailureEntry[] | null;
};

type UpdateCheckView = GlobalView | SystemView;

type FetchState = 'idle' | 'loading' | 'success' | 'error';

type AnnualEntry = { time: number; valueKwh: number; apiValue?: number };

type CleanupDayChange = {
  key: number;
  date: string;
  result: AnnualEntry;
  removed: AnnualEntry[];
  retimed: boolean;
};

type CleanupSystemSummary = {
  systemId: string;
  type: string;
  beforeCount: number;
  afterCount: number;
  removedCount: number;
  retimedCount: number;
  duplicateDays: number;
  sumBefore: number;
  sumAfter: number;
  sumDelta: number;
  sampleChanges?: CleanupDayChange[];
  written?: boolean;
};

type CleanupTotals = {
  removed: number;
  retimed: number;
  sumBefore: number;
  sumAfter: number;
  sumDelta: number;
};

type CleanupPreviewResponse = {
  success: boolean;
  scanned: number;
  affected: number;
  totals: CleanupTotals;
  systems: CleanupSystemSummary[];
  affectedSystemIds: string[];
};

type CleanupCommitResponse = {
  success: boolean;
  requested: number;
  applied: number;
  totals: CleanupTotals;
  systems: CleanupSystemSummary[];
};

const DATE_FORMATS: MatDateFormats = {
  parse: { dateInput: 'DD.MM.YYYY' },
  display: {
    dateInput: 'DD.MM.YYYY',
    monthLabel: 'DD.MM.YYYY',
    monthYearLabel: 'DD.MM.YYYY',
    dateA11yLabel: 'DD.MM.YYYY',
    monthYearA11yLabel: 'DD.MM.YYYY',
  },
};

@Component({
  selector: 'app-update-check',
  standalone: true,
  providers: [provideNativeDateAdapter(DATE_FORMATS)],
  imports: [
    AsyncPipe,
    JsonPipe,
    RouterLink,
    FormsModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule,
    MatChipsModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    HeaderPortalRemoteComponent,
  ],
  templateUrl: './update-check.component.html',
  styleUrl: './update-check.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpdateCheckComponent {
  private readonly route = inject(ActivatedRoute);
  public energyService = inject(EnergyService);
  public systemApiService = inject(SystemApiService);
  public energyErrorsService = inject(EnergyErrorsService);
  private readonly systemsService = inject(SystemsService);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AngularFireAuth);
  private readonly firestore = inject(Firestore);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly runSingleEndpoint =
    'https://us-central1-solar-golan.cloudfunctions.net/energy-runSingleSystemEnergy';
  private readonly runFusionRangeEndpoint =
    'https://us-central1-solar-golan.cloudfunctions.net/energy-runFusionEnergyRange';
  private readonly cleanupPreviewEndpoint =
    'https://us-central1-solar-golan.cloudfunctions.net/energy-cleanupAnnualOrphansPreview';
  private readonly cleanupCommitEndpoint =
    'https://us-central1-solar-golan.cloudfunctions.net/energy-cleanupAnnualOrphansCommit';

  readonly fetchState = signal<FetchState>('idle');
  readonly fetchResult = signal<Record<string, unknown> | null>(null);
  readonly fetchError = signal<string | null>(null);
  readonly fetchErrorDetails = signal<unknown>(null);

  readonly rangeExpanded = signal(false);
  readonly rangeFromDate = signal<Date>(this.daysAgo(7));
  readonly rangeToDate = signal<Date>(this.daysAgo(1));
  readonly rangeFetchState = signal<FetchState>('idle');
  readonly rangeFetchResult = signal<Record<string, unknown> | null>(null);
  readonly rangeFetchError = signal<string | null>(null);
  readonly rangeFetchErrorDetails = signal<unknown>(null);

  readonly fusionFromDate = signal<Date>(this.daysAgo(2));
  readonly fusionToDate = signal<Date>(this.daysAgo(0));
  readonly fusionFetchState = signal<FetchState>('idle');
  readonly fusionFetchResult = signal<Record<string, unknown> | null>(null);
  readonly fusionFetchError = signal<string | null>(null);
  readonly fusionFetchErrorDetails = signal<unknown>(null);

  readonly cleanupPreviewState = signal<FetchState>('idle');
  readonly cleanupPreview = signal<CleanupPreviewResponse | null>(null);
  readonly cleanupPreviewError = signal<string | null>(null);
  readonly cleanupCommitState = signal<FetchState>('idle');
  readonly cleanupCommitResult = signal<CleanupCommitResponse | null>(null);
  readonly cleanupCommitError = signal<string | null>(null);

  public updates = this.energyService.getOldEnergyRecords().pipe(
    map((data) =>
      data?.map((d) => ({
        id: d.id,
        time: d['#modified'],
        date: new Date(d['#modified']).toISOString(),
      }))
    ),
    map((data) => data.sort((a, b) => b.time - a.time)),
    shareReplay({ bufferSize: 1, refCount: true })
  );
  public updatesCount1 = this.updates.pipe(map((updates) => updates.length));

  readonly recentRunDocs$ = this.energyErrorsService.getRecentRunDocs(7).pipe(
    startWith(null as EnergyRunDoc[] | null),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly smaUsersBySystemId$ = this.recentRunDocs$.pipe(
    switchMap((docs) => {
      if (!docs) return of({} as Record<string, string>);
      const smaIds = [
        ...new Set(
          docs
            .flatMap((d) => d.failedSystems)
            .filter((s) => s.api === 'SMA')
            .map((s) => s.systemId)
        ),
      ];
      if (!smaIds.length) return of({} as Record<string, string>);
      return this.systemsService.getSystemsByIds(smaIds).pipe(
        map((systems) => {
          const result: Record<string, string> = {};
          for (const sys of systems) {
            const user = sys.apiId?.[2] as string | undefined;
            if (user) result[sys.id] = user;
          }
          return result;
        })
      );
    }),
    startWith({} as Record<string, string>),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly view$ = this.route.paramMap.pipe(
    map((p) => p.get('systemId')),
    distinctUntilChanged(),
    switchMap((systemId): Observable<UpdateCheckView> => {
      if (!systemId) {
        return of({ kind: 'global' });
      }

      const system$ = this.systemsService
        .getById(systemId)
        .pipe(shareReplay({ bufferSize: 1, refCount: true }));

      return combineLatest({
        system: system$,
        failures: this.energyErrorsService
          .getFailuresForSystemLastDays(systemId, 3)
          .pipe(
            map(
              (rows): { loading: boolean; rows: EnergyFailureEntry[] | null } => ({
                loading: false,
                rows,
              })
            ),
            startWith({ loading: true, rows: null })
          ),
        smaTokenInfo: system$.pipe(
          switchMap((sys) => {
            console.log('[SmaTokens] system:', sys?.name, '| type:', sys?.type, '| apiId:', sys?.apiId);
            const smaUser =
              sys?.type === 'SMA'
                ? ((sys.apiId?.[2] as string | null | undefined) ?? null)
                : null;
            console.log('[SmaTokens] smaUser resolved to:', smaUser);
            return smaUser
              ? this.loadSmaTokenInfo(smaUser)
              : of(null as SmaTokenInfo | null);
          }),
          startWith(null as SmaTokenInfo | null)
        ),
      }).pipe(
        map(({ system, failures, smaTokenInfo }) => {
          const v: SystemView = {
            kind: 'system',
            systemId,
            systemName: system?.name ?? systemId,
            system: system ?? null,
            smaTokenInfo,
            failuresLoading: failures.loading,
            failureRows: failures.rows,
          };
          return v;
        })
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  navigateToSystemApi(systemId: string) {
    this.systemApiService
      .redirectToSystemApi(systemId)
      .pipe(take(1))
      .subscribe();
  }

  formatRunId(runId: string): string {
    const m = /^(\d{4}-\d{2}-\d{2})_(\d{1,2})$/.exec(runId);
    if (!m) {
      return runId;
    }
    return `${m[1]} · hour ${m[2]} (Asia/Jerusalem)`;
  }

  private parseJwtDates(token: string): TokenDates | null {
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64)) as { iat: number; exp: number };
      return {
        issuedAt: new Date(payload.iat * 1000),
        expiresAt: new Date(payload.exp * 1000),
        isExpired: Date.now() > payload.exp * 1000,
      };
    } catch {
      return null;
    }
  }

  private loadSmaTokenInfo(smaUser: string): Observable<SmaTokenInfo | null> {
    console.log('[SmaTokens] fetching doc for smaUser:', smaUser);
    return from(
      getDoc(doc(this.firestore, 'tokens', smaUser)).then((snap) => {
        console.log('[SmaTokens] snap.exists:', snap.exists(), '| id:', snap.id);
        if (!snap.exists()) {
          console.warn('[SmaTokens] document not found in tokens/', smaUser);
          return { smaUser, access: null, refresh: null };
        }
        const data = snap.data() as {
          accessToken?: string;
          refreshToken?: string;
        };
        console.log('[SmaTokens] keys in doc:', Object.keys(data));
        const access = data.accessToken ? this.parseJwtDates(data.accessToken) : null;
        const refresh = data.refreshToken ? this.parseJwtDates(data.refreshToken) : null;
        console.log('[SmaTokens] access:', access, '| refresh:', refresh);
        return { smaUser, access, refresh };
      }).catch((err) => {
        console.error('[SmaTokens] error fetching tokens/', smaUser, err);
        return null;
      })
    );
  }

  toggleRangeExpanded(): void {
    this.rangeExpanded.set(!this.rangeExpanded());
    this.cdr.markForCheck();
  }

  setRangeFromDate(date: Date | null): void {
    if (date) {
      this.rangeFromDate.set(date);
    }
  }

  setRangeToDate(date: Date | null): void {
    if (date) {
      this.rangeToDate.set(date);
    }
  }

  setFusionFromDate(date: Date | null): void {
    if (date) {
      this.fusionFromDate.set(date);
    }
  }

  setFusionToDate(date: Date | null): void {
    if (date) {
      this.fusionToDate.set(date);
    }
  }

  private daysAgo(n: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private startOfDay(d: Date): number {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy.getTime();
  }

  private endOfDay(d: Date): number {
    const copy = new Date(d);
    copy.setHours(23, 59, 59, 999);
    return copy.getTime();
  }

  async runSingleSystemEnergy(systemId: string) {
    this.fetchState.set('loading');
    this.fetchResult.set(null);
    this.fetchError.set(null);
    this.fetchErrorDetails.set(null);

    try {
      const user = await this.auth.currentUser;
      if (!user) {
        throw new Error('No logged-in user');
      }
      const idToken = await user.getIdToken();
      const result = await firstValueFrom(
        this.http.post<Record<string, unknown>>(
          this.runSingleEndpoint,
          { systemId },
          { headers: new HttpHeaders({ Authorization: `Bearer ${idToken}` }) }
        )
      );
      this.fetchResult.set(result);
      this.fetchState.set('success');
    } catch (error: any) {
      const body = error?.error;
      this.fetchError.set(body?.message || error?.message || 'Unknown error');
      this.fetchErrorDetails.set(body?.details ?? null);
      this.fetchState.set('error');
    }
  }

  async runForDaysRange(systemId: string) {
    this.rangeFetchState.set('loading');
    this.rangeFetchResult.set(null);
    this.rangeFetchError.set(null);
    this.rangeFetchErrorDetails.set(null);

    try {
      const user = await this.auth.currentUser;
      if (!user) {
        throw new Error('No logged-in user');
      }
      const idToken = await user.getIdToken();
      const result = await firstValueFrom(
        this.http.post<Record<string, unknown>>(
          this.runSingleEndpoint,
          {
            systemId,
            period: 'DAY',
            from: this.startOfDay(this.rangeFromDate()),
            to: this.endOfDay(this.rangeToDate()),
          },
          { headers: new HttpHeaders({ Authorization: `Bearer ${idToken}` }) }
        )
      );
      this.rangeFetchResult.set(result);
      this.rangeFetchState.set('success');
    } catch (error: any) {
      const body = error?.error;
      this.rangeFetchError.set(body?.message || error?.message || 'Unknown error');
      this.rangeFetchErrorDetails.set(body?.details ?? null);
      this.rangeFetchState.set('error');
    }
  }

  async runFusionRangeAllAccounts() {
    this.fusionFetchState.set('loading');
    this.fusionFetchResult.set(null);
    this.fusionFetchError.set(null);
    this.fusionFetchErrorDetails.set(null);

    try {
      const user = await this.auth.currentUser;
      if (!user) {
        throw new Error('No logged-in user');
      }
      const idToken = await user.getIdToken();
      const result = await firstValueFrom(
        this.http.post<Record<string, unknown>>(
          this.runFusionRangeEndpoint,
          {
            period: 'DAY',
            from: this.startOfDay(this.fusionFromDate()),
            to: this.endOfDay(this.fusionToDate()),
          },
          { headers: new HttpHeaders({ Authorization: `Bearer ${idToken}` }) }
        )
      );
      this.fusionFetchResult.set(result);
      this.fusionFetchState.set('success');
    } catch (error: any) {
      const body = error?.error;
      this.fusionFetchError.set(body?.message || error?.message || 'Unknown error');
      this.fusionFetchErrorDetails.set(body?.details ?? null);
      this.fusionFetchState.set('error');
    }
  }

  private async idToken(): Promise<string> {
    const user = await this.auth.currentUser;
    if (!user) {
      throw new Error('No logged-in user');
    }
    return user.getIdToken();
  }

  /** Dry-run: build the orphan-cleanup preview for all Growatt/FusionSolar systems. */
  async previewAnnualCleanup() {
    this.cleanupPreviewState.set('loading');
    this.cleanupPreview.set(null);
    this.cleanupPreviewError.set(null);
    this.cleanupCommitState.set('idle');
    this.cleanupCommitResult.set(null);
    this.cleanupCommitError.set(null);

    try {
      const idToken = await this.idToken();
      const result = await firstValueFrom(
        this.http.post<CleanupPreviewResponse>(
          this.cleanupPreviewEndpoint,
          {},
          { headers: new HttpHeaders({ Authorization: `Bearer ${idToken}` }) }
        )
      );
      this.cleanupPreview.set(result);
      this.cleanupPreviewState.set('success');
    } catch (error: any) {
      const body = error?.error;
      this.cleanupPreviewError.set(body?.message || error?.message || 'Unknown error');
      this.cleanupPreviewState.set('error');
    }
  }

  /** Apply the cleanup to exactly the systems surfaced by the preview. */
  async commitAnnualCleanup() {
    const preview = this.cleanupPreview();
    const systemIds = preview?.affectedSystemIds ?? [];
    if (!systemIds.length) {
      return;
    }
    this.cleanupCommitState.set('loading');
    this.cleanupCommitResult.set(null);
    this.cleanupCommitError.set(null);

    try {
      const idToken = await this.idToken();
      const result = await firstValueFrom(
        this.http.post<CleanupCommitResponse>(
          this.cleanupCommitEndpoint,
          { systemIds },
          { headers: new HttpHeaders({ Authorization: `Bearer ${idToken}` }) }
        )
      );
      this.cleanupCommitResult.set(result);
      this.cleanupCommitState.set('success');
    } catch (error: any) {
      const body = error?.error;
      this.cleanupCommitError.set(body?.message || error?.message || 'Unknown error');
      this.cleanupCommitState.set('error');
    }
  }
}
