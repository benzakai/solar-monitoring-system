import { Component, inject } from '@angular/core';
import {
  AsyncPipe,
  DatePipe,
  DecimalPipe,
  formatDate,
  JsonPipe,
  NgForOf,
} from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PeopleService } from '../../../../endpoint/people.service';
import { MonitorFacade } from '../../../../state/monitor/monitor.facade';
import {
  BehaviorSubject,
  combineLatest,
  concatMap,
  distinctUntilChanged,
  filter,
  first,
  forkJoin,
  from,
  map,
  of,
  pipe,
  shareReplay,
  startWith,
  switchMap,
  take,
  tap,
} from 'rxjs';
import { EmailsService } from '../../../../endpoint/emails.service';
import { Email } from '../../../../domain/email';
import { LogsTableComponent } from '../../../malfunctions/logs-table/logs-table.component';
import { MatTableModule } from '@angular/material/table';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { SeverityIconComponent } from '../../../malfunctions/severity-icon/severity-icon.component';
import { SortHeaderComponent } from '../../../monitoring/components/sort-header/sort-header.component';
import { TranslatePipe } from '../../../../core/lang/translate.pipe';
import { HeaderPortalRemoteComponent } from '../../../../core/header/header-portal-remote.component';
import { Person } from '../../../../domain/person';
import { MatCheckbox, MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { ReportsService } from '../../../../endpoint/reports.serivce';
import { ReportData } from '../../../../domain/report';
import { Sort } from '@angular/material/sort';
import { DateUtil } from '../../../../core/date/DateUtil';
import { SystemsService } from '../../../../endpoint/systems.service';
import { EnergyService } from '../../../../endpoint/energy.service';
import { EnergyCalc } from '../../../../core/energy/energy-calculator';
import { System } from '../../../../domain/system';
import { Energy } from '../../../../domain/energy';
import { MalfunctionsService } from '../../../../endpoint/malfunctions.service';
import { AppEndpointService } from '../../../../endpoint/app-endpoint.service';
import { WashesService } from '../../../../endpoint/washes.service';
import {
  alignDateToReport,
  createReport,
  createReportDataId,
  reportFileName,
} from './createReport';
import { ReportFilesService } from '../../../../endpoint/report-files.service';
import { DialogService } from '../../../../core/dialog/services/dialog.service';
import { MatDialog } from '@angular/material/dialog';
import { ReportComentComponent } from '../report-coment/report-coment.component';
import { MatFormField, MatFormFieldModule } from '@angular/material/form-field';
import { MatOption } from '@angular/material/core';
import {
  MatSelect,
  MatSelectModule,
  MatSelectTrigger,
} from '@angular/material/select';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MalfunctionsFiltersComponent } from '../../../malfunctions/malfunctions-filters/malfunctions-filters.component';
import { FiltersControlService } from '../../../monitoring/services/filters-control.service';
import { MatInput } from '@angular/material/input';
import { MatSlider, MatSliderRangeThumb } from '@angular/material/slider';
import { MatChipListbox, MatChipOption } from '@angular/material/chips';
import { RouterModule } from '@angular/router';

const ZERO_TIME_EMAIL = {
  delivery: {
    startTime: 0,
  },
};

type See = {
  system: System;
  energy: Energy;
};

@Component({
  selector: 'app-reports-table',
  standalone: true,
  imports: [
    AsyncPipe,
    MatProgressSpinnerModule,
    FormsModule,
    ReactiveFormsModule,
    DatePipe,
    DecimalPipe,
    LogsTableComponent,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    SeverityIconComponent,
    SortHeaderComponent,
    TranslatePipe,
    JsonPipe,
    MatSelectModule,
    MatCheckboxModule,
    MatMenuModule,
    MatFormFieldModule,
    MatFormField,
    MatIcon,
    MatInput,
    MatOption,
    MatSelect,
    MatSelectTrigger,
    MatSlider,
    MatSliderRangeThumb,
    NgForOf,
    MalfunctionsFiltersComponent,
    MatChipListbox,
    MatChipOption,
    RouterModule,
    HeaderPortalRemoteComponent,
  ],
  providers: [FiltersControlService],
  templateUrl: './reports-table.component.html',
  styleUrl: './reports-table.component.css',
})
export class ReportsTableComponent {
  displayedColumns: string[] = [
    'message',
    'checkbox',
    'actions',
    'status',
    'data',
    'systemsNumber',
    'name',
  ];

  peopleService = inject(PeopleService);
  monitorFacade = inject(MonitorFacade);
  emailsService = inject(EmailsService);
  reportsService = inject(ReportsService);
  systemsService = inject(SystemsService);
  energyService = inject(EnergyService);
  malfunctionsService = inject(MalfunctionsService);
  appService = inject(AppEndpointService);
  washesService = inject(WashesService);
  reportFileService = inject(ReportFilesService);
  dialogService = inject(DialogService);
  dialog = inject(MatDialog);
  controls = inject(FiltersControlService);

  selections: { [k in string]: any } = {};

  setSelection(m: any, selected: boolean) {
    this.selections[m._id] = selected;
  }

  isAnySelected(): boolean {
    return Object.keys(this.selections)
      .map((key) => this.selections[key])
      .some(Boolean);
  }

  readonly ANNUAL_REPORT = -1;

  d = new Date();
  dateControl = new FormControl(this.d.getMonth() - 1);
  yearControl = new FormControl(this.d.getFullYear());

  isAnnual = false;

  activeClient = new FormControl([true, false]);

  activeClientState = this.activeClient.valueChanges.pipe(
    startWith(this.activeClient.value)
  );

  activeSort = new BehaviorSubject({
    sortField: 'tracingDate',
    sortDirection: 'asc',
  });

  sortParams = this.activeSort.pipe(
    map(({ sortField, sortDirection }) => ({
      sortField,
      sortDirection: sortDirection === 'asc' ? 1 : -1,
    }))
  );

  statusesList = ['PROCESSING', 'SUCCESS', 'ERROR', 'not_created', 'project'];
  currentStatuses = new BehaviorSubject({
    PROCESSING: true,
    SUCCESS: true,
    ERROR: true,
    not_created: true,
    project: true,
  } as Record<string, boolean>);

  loading = new BehaviorSubject(true);

  selectedDateMonth = this.dateControl.valueChanges.pipe(
    startWith(this.dateControl.value),
    distinctUntilChanged()
  );

  selectedDateYear = this.yearControl.valueChanges.pipe(
    startWith(this.yearControl.value),
    distinctUntilChanged()
  );

  selectedDate = combineLatest([
    this.selectedDateMonth,
    this.selectedDateYear,
  ]).pipe(
    map(([month, year]) => {
      this.isAnnual = month === this.ANNUAL_REPORT;
      const effectiveMonth = this.isAnnual
        ? 0
        : (month ?? this.d.getMonth() - 1);
      const newDate = Date.UTC(
        year || this.d.getUTCFullYear(),
        effectiveMonth,
        1
      );
      return new Date(newDate);
    }),
    shareReplay({ refCount: true, bufferSize: 1 })
  );

  selectedMonth = this.selectedDate.pipe(map((date) => date.getUTCMonth()));
  selectedYear = this.selectedDate.pipe(map((date) => date.getUTCFullYear()));

  clients = this.peopleService.getAllClients();
  clientsWithSystems = combineLatest([
    this.clients.pipe(filter(Boolean)),
    this.monitorFacade.monitorItems.pipe(
      filter(Boolean),
      map((m) => (m || []).filter((s) => s.system_active))
    ),
  ]).pipe(
    map(([clients, systems]) => {
      const systemsMapByClientId = (systems || []).reduce(
        (acc, system) => {
          const clientId = system?.client?.id;
          const currentSystems = acc[clientId] || [];
          return Object.assign(acc, {
            [clientId]: [...currentSystems, system],
          });
        },
        {} as { [clientId: string]: any[] }
      );

      return clients
        .filter((client) => systemsMapByClientId[client._id])
        .map((client) => {
          const systems = systemsMapByClientId[client._id] || [];
          return Object.assign(client, {
            systems,
            numberOfSystems: systems?.length || 0,
          });
        });
    }),
    shareReplay({ refCount: true, bufferSize: 1 })
  );

  clientsWithReports = combineLatest([
    this.clientsWithSystems,
    this.selectedDate.pipe(tap(() => this.loading.next(true))),
  ]).pipe(
    switchMap(([clients, dateSelected]) => {
      const isAnnualMode = this.isAnnual;
      const reportsQuery$ = isAnnualMode
        ? this.reportsService.getReportsFromYear(dateSelected.getUTCFullYear())
        : this.reportsService.getReportsFromMonth(
            dateSelected.getUTCFullYear(),
            dateSelected.getUTCMonth()
          );

      return combineLatest([
        this.emailsService
          .getEmailsFromMonth(
            dateSelected.getUTCFullYear(),
            isAnnualMode ? 0 : dateSelected.getUTCMonth()
          )
          .pipe(
            map((emails) => {
              const emailsByClientId: { [key in string]: Email } = {};
              emails.forEach((email) => {
                const ensureValue = email.toUids || [];
                const ensureArray = Array.isArray(ensureValue)
                  ? ensureValue
                  : [ensureValue];
                ensureArray.forEach((uid) => {
                  const comparison = emailsByClientId[uid] || ZERO_TIME_EMAIL;
                  if (
                    email.delivery?.startTime &&
                    comparison.delivery.startTime < email.delivery.startTime
                  ) {
                    emailsByClientId[uid] = email;
                  }
                });
              });
              return emailsByClientId;
            })
          ),
        reportsQuery$.pipe(
          map(
            (reports) =>
              (reports || []).reduce(
                (acc, report) =>
                  Object.assign(acc, { [report.client.id]: report }),
                {}
              ) as { [key in string]: ReportData }
          )
        ),
      ]).pipe(
        tap(() => this.loading.next(false)),
        map(([emailsMapByClient, reportsMapByClient]) => {
          let missing = 0;

          const clientsWithEmails = clients.map((client) => {
            const email = emailsMapByClient[client._id];
            if (!email) {
              missing++;
            }

            return Object.assign(client, {
              email: email,
              emailMoth: new Date(email?.template?.data?.date).getUTCMonth(),
              report: reportsMapByClient[client._id],
            });
          });

          return clientsWithEmails;
        })
      );
    }),
    shareReplay({ refCount: true, bufferSize: 1 })
  );

  filteredReports = combineLatest([
    this.clientsWithReports,
    this.controls.clientsControlStateMap,
    this.currentStatuses,
    this.activeClientState,
  ]).pipe(
    map(
      ([
        clientAndReports,
        clientsSelectedMap,
        statusesSelected,
        activeClients,
      ]) => {
        this.selections = {};
        const filters: Array<(item: (typeof clientAndReports)[0]) => boolean> =
          [];

        filters.push((item) => {
          const status =
            item?.email?.delivery.state ||
            (item.report ? 'project' : 'not_created');
          return Boolean(statusesSelected[status]);
        });

        if (Object.keys(clientsSelectedMap || {}).length) {
          filters.push((item) =>
            Boolean(item._id && clientsSelectedMap[item._id])
          );
        }

        const activityOfClientsArray = activeClients || [];

        if (activityOfClientsArray.length !== 2) {
          filters.push((item) =>
            activityOfClientsArray.includes(item.isActive || false)
          );
        }

        return clientAndReports.filter((item) =>
          filters.every((filter) => filter(item))
        );
      }
    )
  );

  compare(a: any, b: any, isAsc: boolean) {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
  }

  sortedReports = combineLatest([this.filteredReports, this.sortParams]).pipe(
    map(([reports, sorts]) =>
      [...reports].sort((a, b) => {
        const isAsc = sorts.sortDirection === 1;
        switch (sorts.sortField) {
          case 'systemsNumber':
            return this.compare(a.numberOfSystems, b.numberOfSystems, isAsc);
          default:
            return 0;
        }
      })
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  sendToSelected() {
    const dialog = this.dialogService.loader(true);
    let sent = 1;
    const isAnnual = this.isAnnual;

    this.filteredReports
      .pipe(
        take(1),
        switchMap((reports) => {
          const toBeSent = reports.filter((r) => this.selections[r._id]);
          dialog.componentInstance.setMessage(`1/${toBeSent.length}`);

          return from(toBeSent).pipe(
            concatMap((client) => {
              const time = client.report.date;
              const docId = this.reportDocId(client._id, time, isAnnual);

              return this.reportFileService
                .generatePdfForEmail('report-preview', docId)
                .pipe(
                  switchMap((url) => {
                    const dock = {
                      toUids: [client._id],
                      ccUids: client.sendingList?.filter(Boolean),
                      template: this.createEmailTemplate(
                        url,
                        client,
                        time,
                        isAnnual
                      ),
                    };
                    return this.emailsService.saveDocsToSend([dock]).pipe(
                      tap(() => {
                        sent++;
                        dialog.componentInstance.setMessage(
                          `${sent}/${toBeSent.length}`
                        );
                      })
                    );
                  })
                );
            })
          );
        })
      )
      .subscribe({
        complete: () => {
          dialog.close();
          this.selections = {};
        },
      });
  }

  trackTable(i: number, item: Partial<Person>) {
    return item?._id;
  }

  preview(client: Person, existingReport?: ReportData) {
    const isAnnual = this.isAnnual;
    this.selectedDate.pipe(first()).subscribe((date) => {
      const reportTime =
        existingReport?.date || alignDateToReport(date).getTime();
      const queryParam = this.reportDocId(client._id, reportTime, isAnnual);
      const url = `${window.location.origin}/report-preview/${queryParam}`;

      window.open(
        url,
        'targetWindow',
        'toolbar=no, location=no, status=no, menubar=no, scrollbars=yes, resizable=no, width=794, height=1123'
      );
    });
  }

  private reportDocId(
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

  download(client: Person, existingReportTime: number) {
    const dialog = this.dialogService.loader();
    const isAnnual = this.isAnnual;
    this.selectedDate
      .pipe(
        first(),
        map((date) => existingReportTime || alignDateToReport(date).getTime()),
        switchMap((time) => {
          const docId = this.reportDocId(client._id, time, isAnnual);

          return this.reportFileService
            .generatePdf('report-preview', docId)
            .pipe(map((response) => ({ response, time })));
        })
      )
      .subscribe(({ response, time }) => {
        const objectURL = URL.createObjectURL(response);
        const fileName = reportFileName(client.name, time, isAnnual);
        this.reportFileService.downloadPdf(objectURL, fileName);
        setTimeout(() => dialog.close());
      });
  }

  recreateReport(systems: System[], comment?: string) {
    const dialog = this.dialogService.loader();
    const isAnnual = this.isAnnual;
    this.selectedDate
      .pipe(
        switchMap((date) => {
          const dateOfFirstDay: Date = alignDateToReport(date);
          const systemsWithContracts = systems.filter((s) =>
            Boolean(s.contract)
          );

          return systemsWithContracts.length
            ? forkJoin(
                systemsWithContracts.map((s) =>
                  this.createReportFromSystem(
                    s.id,
                    dateOfFirstDay,
                    isAnnual,
                    comment
                  )
                )
              )
            : of([]);
        })
      )
      .subscribe(() => {
        console.log('Reports created:');
        dialog.close();
      });
  }

  private createReportFromSystem(
    systemId: string,
    date: Date = new Date(),
    isAnnual: boolean,
    comment?: string
  ) {
    const from = isAnnual
      ? DateUtil.StartOfYear(+date)
      : DateUtil.StartOfMonth(+date);
    const to = isAnnual
      ? DateUtil.EndOfYear(+date)
      : DateUtil.EndOfMonth(+date);

    return this.systemsService.getById(systemId).pipe(
      filter(Boolean),
      switchMap((system) =>
        this.systemsService
          .getSystemsByIds(system?.location?.relatedSystems || [])
          .pipe(
            switchMap((relatedSystems) => {
              return combineLatest([
                this.energyService
                  .getEnergyByIds(system?.location?.relatedSystems || [])
                  .pipe(map((energies) => (energies || []).filter(Boolean))),
                this.energyService.getEnergy(systemId),
                this.malfunctionsService.getUnlimitedForSystem(systemId),
                this.appService.getMalfunctionsTypes(),
                this.washesService.getBySystemId(systemId, true),
                this.appService.get('prediction').pipe(filter(Boolean)),
                this.appService.get('TaarifConstants').pipe(filter(Boolean)),
              ]).pipe(
                switchMap(
                  ([
                    energies,
                    mainSystemEnergy,
                    allMalfunctions,
                    malfunctionTypes,
                    washes,
                    prediction,
                    tarifs,
                  ]) => {
                    const systemsAndEnergies: See[] = relatedSystems
                      .map((system) => ({
                        system,
                        energy: energies.find((e) => e.id === system.id),
                      }))
                      .filter(
                        (see): see is See =>
                          !see.system.excludeFromAverage &&
                          Boolean(see.system && see.energy)
                      );
                    const meanEnergy = EnergyCalc.GetMeanCalculationReport(
                      systemsAndEnergies,
                      from,
                      to,
                      false
                    );

                    const doc = createReport(
                      system,
                      mainSystemEnergy,
                      meanEnergy,
                      allMalfunctions,
                      malfunctionTypes,
                      washes,
                      date,
                      isAnnual,
                      prediction,
                      tarifs,
                      comment
                    );

                    const id = createReportDataId(system.id, date, isAnnual);

                    console.log(id);
                    console.log(doc);

                    return this.reportsService.setDocument(id, doc);
                  }
                )
              );
            })
          )
      )
    );
  }

  reportDoc({}) {}

  onSort(sortState: Sort) {
    this.activeSort.next({
      sortDirection: sortState.direction,
      sortField: sortState.active,
    });
  }

  numberOfClients = this.controls.clientsControlState.pipe(
    map((systems) => systems?.length || 'All')
  );

  comment(name: string, systems: System[], report?: ReportData) {
    this.dialog
      .open(ReportComentComponent, {
        data: {
          name,
          comment: report?.reportComment,
        },
      })
      .afterClosed()
      .subscribe((comment) => {
        if (comment) {
          this.recreateReport(systems, comment);
        }
      });
  }

  toggleStatus(status: string) {
    const current = this.currentStatuses.value;
    this.currentStatuses.next({
      ...current,
      [status]: !Boolean(current[status]),
    });
  }

  sendEmail(client: Person, time: number) {
    const dialog = this.dialogService.loader();
    const isAnnual = this.isAnnual;
    const docId = this.reportDocId(client._id, time, isAnnual);

    this.reportFileService
      .generatePdfForEmail('report-preview', docId)
      .pipe(
        switchMap((url) => {
          const dock = {
            toUids: [client._id],
            ccUids: client.sendingList?.filter(Boolean),
            template: this.createEmailTemplate(url, client, time, isAnnual),
          };
          return this.emailsService.saveDocsToSend([dock]);
        })
      )
      .subscribe(() => dialog.close());
  }

  emailDocId(clientId: string, date: number, isAnnual: boolean): string {
    const tags = [clientId, date];
    if (isAnnual) {
      tags.push('A');
    }
    return tags.join('_');
  }

  private createEmailTemplate(
    fileUrl: string,
    client: Person,
    date: number,
    isAnnual: boolean
  ): any {
    const d = new Date(date);
    date = Date.UTC(d.getFullYear(), d.getMonth(), 1);
    const dateFormat = isAnnual ? 'yyyy' : 'MMMM yyyy';
    const docId = this.emailDocId(client._id, date, isAnnual);
    return {
      name: isAnnual ? 'annualReport' : 'report',
      data: {
        clientId: client._id,
        clientName: client.clientName || client.name,
        date: date,
        dateString: formatDate(date, dateFormat, 'he'),
        fileUrl,
        //fileUrl: `https://us-central1-solar-golan.cloudfunctions.net/pdf-createPdf/report-preview/${docId}`,
      },
    };
  }
}
