import { Component, inject } from '@angular/core';
import { AsyncPipe, DatePipe, DecimalPipe, JsonPipe } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PeopleService } from '../../../../endpoint/people.service';
import { MonitorFacade } from '../../../../state/monitor/monitor.facade';
import {
  BehaviorSubject,
  combineLatest,
  filter,
  first,
  forkJoin,
  map,
  of,
  pipe,
  shareReplay,
  switchMap,
  take,
} from 'rxjs';
import { EmailsService } from '../../../../endpoint/emails.service';
import { Email } from '../../../../domain/email';
import { LogsTableComponent } from '../../../malfunctions/logs-table/logs-table.component';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { SeverityIconComponent } from '../../../malfunctions/severity-icon/severity-icon.component';
import { SortHeaderComponent } from '../../../monitoring/components/sort-header/sort-header.component';
import { TranslatePipe } from '../../../../core/lang/translate.pipe';
import { Person } from '../../../../domain/person';
import { MatCheckbox } from '@angular/material/checkbox';
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

const ZERO_TIME_EMAIL: Pick<Email, 'delivery'> = {
  delivery: {
    endTime: 0,
    startTime: 0,
    state: '',
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
    MatCheckbox,
    MatMenuModule,
  ],
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

  checked = {};

  d = new Date();
  nowDontUse = Date.UTC(this.d.getFullYear(), this.d.getMonth() - 1, 1);
  selectedDate = of(new Date(this.nowDontUse));
  selectedMonth = this.selectedDate.pipe(map((date) => date.getUTCMonth()));
  selectedYear = this.selectedDate.pipe(map((date) => date.getUTCFullYear()));

  clients = this.peopleService.getAllClients();
  clientsWithSystems = combineLatest([
    this.clients.pipe(filter(Boolean)),
    this.monitorFacade.monitorItems.pipe(
      filter(Boolean),
      take(1),
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

      return clients.map((client) => {
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
    this.selectedDate,
  ]).pipe(
    switchMap(([clients, dateSelected]) =>
      combineLatest([
        this.emailsService
          .getEmailsFromMonth(
            dateSelected.getUTCFullYear(),
            dateSelected.getUTCMonth()
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
                    comparison.delivery.startTime < email.delivery.startTime
                  ) {
                    emailsByClientId[uid] = email;
                  }
                });
              });
              return emailsByClientId;
            })
          ),
        this.reportsService
          .getReportsFromMonth(
            dateSelected.getUTCFullYear(),
            dateSelected.getUTCMonth()
          )
          .pipe(
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

          console.log('Missing emails for clients:', missing);
          return clientsWithEmails;
        })
      )
    ),
    shareReplay({ refCount: true, bufferSize: 1 })
  );

  compare(a: any, b: any, isAsc: boolean) {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
  }

  sortedReports = combineLatest([
    this.clientsWithReports,
    this.sortParams,
  ]).pipe(
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

  trackTable(i: number, item: Partial<Person>) {
    return item?._id;
  }

  preview(
    client: Person,
    existingReport?: ReportData,
    isAnnual: boolean = false
  ) {
    this.selectedDate.pipe(first()).subscribe((date) => {
      const reportTime =
        existingReport?.date || alignDateToReport(date).getTime();
      const queryParam = this.reportDocId(client._id, reportTime, isAnnual);
      const url = `${window.location.origin}/report-preview/${queryParam}`;

      window.location.origin;

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

  download(
    client: Person,
    existingReportTime: number,
    isAnnual: boolean = false
  ) {
    const dialog = this.dialogService.loader();
    this.selectedDate
      .pipe(
        first(),
        map((date) => existingReportTime || alignDateToReport(date).getTime()),
        switchMap((time) => {
          const docId = this.reportDocId(client._id, time, isAnnual);

          return this.reportFileService
            .generatePdf('report-view', docId)
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

  recreateReport(
    systems: System[],
    isAnnual: boolean = false,
    comment?: string
  ) {
    const dialog = this.dialogService.loader();
    this.selectedDate
      .pipe(
        switchMap((date) => {
          const dateOfFirstDay: Date = alignDateToReport(date);
          return forkJoin(
            systems.map((s) =>
              this.createReportFromSystem(
                s.id,
                dateOfFirstDay,
                isAnnual,
                comment
              )
            )
          );
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
                this.malfunctionsService.getForSystem(systemId),
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
                      .filter((see): see is See =>
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
}
