import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { AsyncPipe } from '@angular/common';
import { map } from 'rxjs/operators';
import { MonitorFacade } from '../../state/monitor/monitor.facade';
import { DateUtil } from '../../core/date/DateUtil';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { BehaviorSubject, combineLatest, Observable, of, from } from 'rxjs';
import { UsersService, UserRole } from '../../endpoint/users.service';
import { Firestore, collection } from '@angular/fire/firestore';
import { collectionData } from '@angular/fire/firestore';
import { Check } from '../../domain/checks';
import { TranslatePipe } from '../../core/lang/translate.pipe';
import { SystemsService } from '../../endpoint/systems.service';
import { PeopleService } from '../../endpoint/people.service';
import { PaymentsService } from '../../endpoint/payments.service';
import { AnyPayment, PaymentStatus } from '../../domain/payment';
import { DoubleMonthSnapshot, MonthlyStatisticsService } from '../../core/services/monthly-statistics.service';
import { switchMap } from 'rxjs/operators';

type UserPerfRow = { name: string; today: number; month: number };

@Component({
  selector: 'app-management',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    AsyncPipe,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    TranslatePipe,
  ],
  templateUrl: './management.component.html',
  styleUrl: './management.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManagementComponent {
  private facade = inject(MonitorFacade);
  private usersService = inject(UsersService);
  private firestore = inject(Firestore);
  private systems = inject(SystemsService);
  private people = inject(PeopleService);
  private payments = inject(PaymentsService);
  private monthlyStatistics = inject(MonthlyStatisticsService);
  month$ = new BehaviorSubject<Date>(new Date());
  readonly rawActiveSystems = this.systems
    .getSystems()
    .pipe(
      map((systems) =>
        systems.filter(
          (s) => s.isActive && s.contract && Number.isFinite(s.KWP)
        )
      )
    );

  private readonly activeSystems$ = this.facade.monitorItems.pipe(
    map((items) =>
      items.filter((s) => Boolean(s.system_active && s.kwp && s.contract))
    )
  );

  checkedToday$ = this.facade.monitorItems.pipe(
    map(
      (items) =>
        items.filter((i) => i?.lastCheck && DateUtil.IsToday(i.lastCheck.date))
          .length
    )
  );

  checkedThisMonth$ = this.facade.monitorItems.pipe(
    map(
      (items) =>
        items.filter(
          (i) =>
            i?.lastCheck && DateUtil.IsSameMonth(i.lastCheck.date, Date.now())
        ).length
    )
  );

  systemsCount$ = this.activeSystems$.pipe(
    map((systems) => systems?.filter((s) => s.client).length)
  );

  totalKwp$ = this.activeSystems$.pipe(
    map((systems) => systems.reduce((acc, s) => acc + Number(s.kwp || 0), 0))
  );

  rawTotalKwp$ = this.rawActiveSystems.pipe(
    map((systems) => {
      const res = systems.reduce((acc, i) => {
        //const actual =
        return Object.assign(acc, {
          [i.contract]: ((acc || {})[i.contract] || 0) + i.KWP,
        });
      }, {} as any);

      return systems.reduce(
        (acc, s) => acc + Number(isNaN(s.KWP) ? 0 : Math.round(s.KWP)),
        0
      );
    })
  );

  clientsCount$ = this.facade.clients.pipe(map((clients) => clients.length));

  // --- Month navigator (used by monthly stats card) ---

  canNext$ = this.month$.pipe(
    map((d) => {
      const next = new Date(d);
      next.setMonth(next.getMonth() + 1);
      return +next <= Date.now();
    })
  );
  canPrev$ = new BehaviorSubject<boolean>(false);
  prevMonth() {
    const d = new Date(this.month$.value);
    d.setMonth(d.getMonth() - 1);
    this.month$.next(d);
  }
  nextMonth() {
    const d = new Date(this.month$.value);
    d.setMonth(d.getMonth() + 1);
    this.month$.next(d);
  }

  // ---- Charges summary (computed from Firestore payments, mirroring golan-solar) ----
  // All payment statuses, not including HOLD (filter(Boolean) removes 0)
  paymentStatuses = [
    PaymentStatus.CHARGE_PENDING,
    PaymentStatus.PAYMENT_PENDING,
    PaymentStatus.PAYED,
  ];

  paymentStatusDictionary: Record<PaymentStatus, string> = {
    [PaymentStatus.HOLD]: 'ממתין לביקור טכנאי',
    [PaymentStatus.CHARGE_PENDING]: 'ממתין לחיוב',
    [PaymentStatus.PAYMENT_PENDING]: 'ממתין לתשלום',
    [PaymentStatus.PAYED]: 'שולם',
  };

  chargesSummary$ = this.payments.getAllPayments().pipe(
    map((payments: AnyPayment[]) => {
      // Group payments by status
      const grouped: Record<number, AnyPayment[]> = {};
      for (const p of payments || []) {
        const status = p.status;
        if (!grouped[status]) grouped[status] = [];
        grouped[status].push(p);
      }

      // Return array of sums in the same order as paymentStatuses
      return this.paymentStatuses.map((status) => {
        const group = grouped[status] || [];
        return group.reduce((acc, p) => acc + (Number(p.price) || 0), 0);
      });
    })
  );

  // ---- Monthly statistics (from Firestore monthlyStatistics like old app-statistics) ----
  monthlyStats$: Observable<
    | {
        current: DoubleMonthSnapshot['currentMonth'];
        change: DoubleMonthSnapshot['change'];
        changeRatio: DoubleMonthSnapshot['changeRatio'];
        hasPrevMonth: boolean;
      }
    | undefined
  > = this.month$.pipe(
    switchMap((d) =>
      from(this.monthlyStatistics.getTwoMonths(+d)).pipe(
        map((snap) => {
          this.canPrev$.next(!!snap?.hasPrevMonth);
          return snap
            ? {
                current: snap.currentMonth,
                change: snap.change,
                changeRatio: snap.changeRatio,
                hasPrevMonth: snap.hasPrevMonth,
              }
            : undefined;
        })
      )
    )
  );

  // --- Users performance (today/month checks per coordinator) ---
  private routineChecks$!: Observable<Array<{ checks: Check[] }>>;
  usersPerformance$!: Observable<UserPerfRow[]>;

  displayedColumns: Array<keyof UserPerfRow> = ['name', 'today', 'month'];

  constructor() {
    this.routineChecks$ = collectionData(
      collection(this.firestore, 'routine-checks')
    ) as unknown as Observable<
      Array<{
        checks: Check[];
      }>
    >;

    this.usersPerformance$ = combineLatest([
      this.usersService.getAllUsers(),
      this.routineChecks$,
    ]).pipe(
      map(([users, checksDocs]) => {
        const coordinators = (users || []).filter(
          (u: any) => u?.role === UserRole.COORDINATOR
        );
        const today = Date.now();
        const byUid: Record<string, UserPerfRow> = {};

        for (const user of coordinators) {
          byUid[user.uid] = {
            name: user.displayName || user.email || user.uid,
            today: 0,
            month: 0,
          };
        }

        (checksDocs || []).forEach((doc: any) => {
          const list: Check[] = doc?.checks || [];
          list.forEach((c) => {
            if (!byUid[c.uid]) return;
            if (DateUtil.IsSameMonth(c.date, today)) byUid[c.uid].month += 1;
            if (DateUtil.IsToday(c.date)) byUid[c.uid].today += 1;
          });
        });

        return Object.values(byUid);
      })
    );
  }
}
