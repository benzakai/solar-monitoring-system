import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
} from '@angular/core';
import {
  MalfunctionAction,
  Malfunction,
  MalfunctionActionType,
  MalfunctionHandler,
  MalfunctionStatus,
  malfunctionTypesMap,
} from '../../../domain/malfunction';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ActivatedRoute } from '@angular/router';
import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  filter,
  of,
  map,
  Observable,
  shareReplay,
  switchMap,
  take,
  firstValueFrom,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '../../../core/lang/translate.pipe';
import { HeaderComponent } from '../../../core/header/header.component';
import { HeaderPortalRemoteComponent } from '../../../core/header/header-portal-remote.component';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MalfunctionActionsService } from '../services/malfunction-actions.service';
import { SystemsService } from '../../../endpoint/systems.service';
import { RoutingService } from '../../../core/routing/routing.service';
import { AsyncPipe, DatePipe, DecimalPipe, NgForOf } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { UsersService } from '../../../endpoint/users.service';
import { MalfunctionsService } from '../../../endpoint/malfunctions.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { EnergyService } from '../../../endpoint/energy.service';
import { EnergyCalc } from '../../../core/energy/energy-calculator';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { DialogService } from '../../../core/dialog/services/dialog.service';
import { MatDialog } from '@angular/material/dialog';
import { DateUtil } from '../../../core/date/DateUtil';
import { RoutineCheckService } from '../../../endpoint/routine-check.service';
import { EditLogDialogComponent } from './edit-log-dialog/edit-log-dialog.component';

@Component({
  selector: 'app-malfunciton-edit',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    TranslatePipe,
    HeaderComponent,
    HeaderPortalRemoteComponent,
    MatSelectModule,
    MatInputModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    AsyncPipe,
    MatTableModule,
    DatePipe,
    DecimalPipe,
    NgForOf,
    MatProgressSpinner,
  ],
  providers: [DialogService],
  templateUrl: './malfunciton-edit.component.html',
  styleUrl: './malfunciton-edit.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MalfuncitonEditComponent {
  private routineCheckService = inject(RoutineCheckService);
  fb = inject(FormBuilder);
  routingService = inject(RoutingService);
  activatedRoute = inject(ActivatedRoute);
  usersService = inject(UsersService);
  destroyRef = inject(DestroyRef);
  malfunctionActionsService = inject(MalfunctionActionsService);
  systemService = inject(SystemsService);
  energyService = inject(EnergyService);
  malfunctionsService = inject(MalfunctionsService);
  auth = inject(AngularFireAuth);
  dialog = inject(MatDialog);
  malfunctionId = this.activatedRoute.params.pipe(
    map((params) => params['id']),
    filter(Boolean)
  );

  dialogService = inject(DialogService);
  translatePipe = new TranslatePipe();
  currentUserId = this.auth.user.pipe(
    filter(Boolean),
    map((user) => user.uid)
  );

  displayedColumns: string[] = ['btts', 'text', 'handler', 'action', 'date'];

  malfunction: Observable<Malfunction> = this.malfunctionId.pipe(
    takeUntilDestroyed(this.destroyRef),
    switchMap((id) => this.malfunctionActionsService.getMalfunction(id)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  isClosed = this.malfunction.pipe(
    map((malfunction) => malfunction.status === MalfunctionStatus.CLOSED)
  );

  users: Observable<Record<string, string>> = this.malfunction.pipe(
    switchMap((malfunction) =>
      this.usersService
        .getUsersByUids(malfunction.log.map((log) => log.by))
        .pipe(
          map((users) =>
            users.reduce(
              (acc, user) => ({ ...acc, [user.uid]: user.displayName }),
              {}
            )
          )
        )
    )
  );

  system = this.malfunction.pipe(
    filter((malfunction): malfunction is Malfunction => !!malfunction),
    switchMap((malfunction) =>
      this.systemService.getById(malfunction.systemId)
    ),
    filter(Boolean),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  lastDay = this.malfunction.pipe(
    distinctUntilChanged(
      (previous, current) => previous?.systemId === current?.systemId
    ),
    switchMap((malfunction) =>
      combineLatest([
        this.energyService.getEnergy(malfunction.systemId),
        this.system,
      ]).pipe(
        map(([energy, system]) => {
          const lastDay = energy
            ? EnergyCalc.daysBackEnergy(energy, 1, system.KWP)
            : 0;
          return (lastDay / (malfunction?.kwhKwpSnapshot || 1)) * 100;
        })
      )
    )
  );

  form: FormGroup = this.fb.group({
    customerPrice: [null],
    golanSolarPrice: [null],
    code: [''],
    tracingTime: [''],
    handler: [''],
    reportText: [''],
    notToReport: [false],
    openTime: [''],
    closeTime: [''],
    type: [''],
    severity: [''],
    description: [''],
  });

  severityLevels = [1, 2, 3];

  malfunctionTypes = ['Electrical', 'Mechanical', 'Software'];
  malfunctionSubTypes = ['Voltage issue', 'Sensor failure', 'Firmware bug'];

  malfunctionTypesMap = malfunctionTypesMap;
  issueTypes: string[] = Object.keys(malfunctionTypesMap);

  statusKeys: string[] = [
    'faulty_optimization',
    'system_without',
    'issue_opened_solar_edge',
    'power_outage',
    'communication',
    'communication_production',
    'production',
    'report_for_customer',
    'group_report',
    'high_voltage_observed',
    'brief_morning_leakage_detected',
    'call_center_track_update',
    'found_ok_after_follow_up',
  ];

  constructor(private afs: AngularFirestore) {
    this.malfunction.pipe(take(1), takeUntilDestroyed()).subscribe((data) => {
      if (data) {
        const type = data?.type ? data?.type[0] : '';
        const hasDescription = !!data.description?.trim();
        const hasReportText = !!data.reportText?.trim();
        this.form.patchValue({
          ...data,
          reportText:
            hasDescription && !hasReportText ? data.description : data.reportText,
          openTime: DateUtil.FromUtcMidnightIso(data.openTime) ?? null,
          closeTime: DateUtil.FromUtcMidnightIso(data.closeTime) ?? null,
          tracingTime: DateUtil.FromUtcMidnightIso(data.tracingTime) ?? null,
          type,
        });
      }
    });
  }

  comment = new FormControl('');

  handlers = Object.values(MalfunctionHandler);

  addToTextarea(text: string, field: string) {
    const val = this.form.get(field)?.value;
    this.form.get(field)?.setValue(val + ' ' + text);
  }

  save(options?: { reopen?: boolean; close?: Date }) {
    const dial = this.dialogService;
    const loader = this.dialogService.loader();
    this.form?.markAllAsTouched();
    if (this.form?.valid) {
      this.malfunction
        .pipe(
          take(1),
          takeUntilDestroyed(this.destroyRef),
          switchMap((malfunction) =>
            combineLatest([
              this.malfunctionsService.generateLogEntry(
                malfunction,
                MalfunctionActionType.REOPEN
              ),
              this.malfunctionsService.generateLogEntry(
                malfunction,
                MalfunctionActionType.CLOSE
              ),
            ]).pipe(
              map(([reopenEntry, closedEntry]) => ({
                malfunction,
                reopenEntry,
                closedEntry,
              }))
            )
          )
        )
        .subscribe(({ malfunction, reopenEntry, closedEntry }) => {
          const type = malfunction.type || ['', ''];
          type[0] = this.form.value.type;

          let result: Malfunction = {
            ...malfunction,
            ...this.form.value,
            // Normalize dates to UTC midnight ISO
            tracingTime:
              DateUtil.ToUtcMidnightIso(this.form.value.tracingTime) ?? null,
            type,
          };

          // Ensure openTime is saved as ISO string at UTC midnight (keep previous if not provided)
          const normalizedOpen = DateUtil.ToUtcMidnightIso(
            this.form.value.openTime
          );
          if (normalizedOpen) {
            result = { ...result, openTime: normalizedOpen };
          }

          // Normalize closeTime from form to UTC midnight ISO string
          if (this.form.value.closeTime) {
            result = {
              ...result,
              closeTime: DateUtil.ToUtcMidnightIso(this.form.value.closeTime),
            };
          }

          if (options?.reopen) {
            result = {
              ...result,
              status: MalfunctionStatus.OPEN,
              log: reopenEntry.log,
            };
          }

          if (options?.close) {
            const maybeDate: any = options.close as any;
            const selectedDate: Date | null =
              maybeDate instanceof Date
                ? maybeDate
                : maybeDate?.value instanceof Date
                  ? (maybeDate.value as Date)
                  : null;

            const closeUtcMidnightIso = DateUtil.ToUtcMidnightIso(
              selectedDate || undefined
            );

            result = {
              ...result,
              status: MalfunctionStatus.CLOSED,
              closeTime: closeUtcMidnightIso,
              log: closedEntry.log,
            };
          }

          this.afs
            .collection('malfunctions')
            .doc(this.activatedRoute.snapshot.params['id'])
            .update(result)
            .then(async () => {
              loader.close();
              await firstValueFrom(
                this.routineCheckService.ensureTodayChecked(malfunction.systemId)
              );
              dial.confirm({
                message: this.translatePipe.transform('malfunction.dataSaved'),
                displayCancel: false,
              });
            });
        });
    }
  }

  deleteMalfunction() {
    this.malfunction
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((malfunction) =>
          this.malfunctionActionsService
            .deleteMalfunction({
              id: this.activatedRoute.snapshot.params['id'],
            })
            .pipe(
              map((isSuccess) => (isSuccess ? malfunction.systemId : undefined))
            )
        )
      )
      .subscribe((id) => this.routingService.goToSystemDetails(id));
  }

  navigateToSystemApi(systemId: string) {
    this.routingService.navigateToSystemApi(systemId);
  }

  cancel() {
    this.malfunction.pipe(take(1)).subscribe((malfunction) => {
      this.routingService.goToSystemDetails(malfunction.systemId);
    });
  }

  goToSystem(id: string) {
    this.routingService.goToSystemDetails(id);
  }

  closeMalfunction() {
    this.malfunction
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        take(1),
        switchMap((malfunction) =>
          this.malfunctionActionsService.closeMalfunction(malfunction)
        ),
        filter(Boolean)
      )
      .subscribe((date) => {
        this.save({ close: date });
      });
  }

  commentUpdating = new BehaviorSubject(false);

  addCommentLog() {
    if (!this.comment.value) {
      return;
    }
    this.commentUpdating.next(true);
    this.malfunctionId
      .pipe(
        take(1),
        switchMap((malfunctionId) =>
          this.malfunctionsService.addLogEntry(
            malfunctionId,
            MalfunctionActionType.ADD_COMMENT,
            this.comment.value || ''
          )
        )
      )
      .subscribe(() => {
        this.commentUpdating.next(false);
        this.comment.setValue('');
        this.ensureTodayChecked();
      });
  }

  deletingLog = new BehaviorSubject(false);
  editingLog = new BehaviorSubject(false);

  deleteLog(idx: number) {
    this.deletingLog.next(true);
    this.malfunction
      .pipe(
        take(1),
        switchMap((malfunction) =>
          this.malfunctionsService.deleteLogEntry(malfunction.id, idx)
        )
      )
      .subscribe(() => {
        this.deletingLog.next(false);
        this.ensureTodayChecked();
      });
  }

  editLog(log: MalfunctionAction, idx: number) {
    const dialogRef = this.dialog.open(EditLogDialogComponent, {
      data: { text: log.text || '' },
      width: '520px',
    });

    dialogRef
      .afterClosed()
      .pipe(
        filter((result): result is { text: string } => !!result),
        switchMap((result) => {
          this.editingLog.next(true);
          return this.malfunction.pipe(
            take(1),
            switchMap((malfunction) =>
              this.malfunctionsService.updateLogEntry(
                malfunction.id,
                idx,
                result.text
              )
            )
          );
        })
      )
      .subscribe({
        next: () => {
          this.editingLog.next(false);
          this.ensureTodayChecked();
        },
        error: () => this.editingLog.next(false),
      });
  }

  private ensureTodayChecked() {
    this.malfunction
      .pipe(
        take(1),
        switchMap((malfunction) =>
          malfunction?.systemId
            ? this.routineCheckService.ensureTodayChecked(malfunction.systemId)
            : of(null)
        )
      )
      .subscribe();
  }

  protected readonly Boolean = Boolean;
}
