import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Inject,
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIcon } from '@angular/material/icon';
import {
  MatDateFormats,
  MatOption,
  provideNativeDateAdapter,
} from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatSelect } from '@angular/material/select';
import { NgForOf } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MalfunctionsService } from '../../../../endpoint/malfunctions.service';
import { MonitorItem } from '../../../../domain/monitor-item';
import { TranslatePipe } from '../../../../core/lang/translate.pipe';
import {
  MalfunctionHandler,
  MalfunctionStatus,
  malfunctionTypesMap,
} from '../../../../domain/malfunction';
import { DateUtil } from '../../../../core/date/DateUtil';

export const DATE_FORMATS: MatDateFormats = {
  parse: {
    dateInput: 'DD.MM.YYYY',
  },
  display: {
    dateInput: 'DD.MM.YYYY',
    monthLabel: 'DD.MM.YYYY',
    monthYearLabel: 'DD.MM.YYYY',
    dateA11yLabel: 'DD.MM.YYYY',
    monthYearA11yLabel: 'DD.MM.YYYY',
  },
};

@Component({
  selector: 'app-create-alert-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    TranslatePipe,
    MatFormFieldModule,
    MatInputModule,
    MatIcon,
    MatDatepickerModule,
    ReactiveFormsModule,
    MatOption,
    MatSelect,
    NgForOf,
    MatProgressSpinnerModule,
    MatCheckboxModule,
  ],
  templateUrl: './create-alert-dialog.component.html',
  styleUrl: './create-alert-dialog.component.css',
  providers: [provideNativeDateAdapter(DATE_FORMATS)],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateAlertDialogComponent {
  malfunctionsService = inject(MalfunctionsService);

  alertForm: FormGroup = new FormGroup({
    customerPrice: new FormControl<number | null>(null),
    golanSolarPrice: new FormControl<number | null>(null),
    code: new FormControl(''),
    tracingTime: new FormControl<Date | null>(null),
    handler: new FormControl<MalfunctionHandler | string>(''),
    reportText: new FormControl(''),
    notToReport: new FormControl(false),
    openTime: new FormControl(new Date()),
    closeTime: new FormControl<Date | null>(null),
    type: new FormControl(''),
    severity: new FormControl<number>(2),
    description: new FormControl(''),
    requestNumber: new FormControl(''),
  });

  malfunctionTypesMap = malfunctionTypesMap;
  issueTypes: string[] = Object.keys(malfunctionTypesMap);
  handlers = Object.values(MalfunctionHandler);
  severityLevels = [1, 2, 3];

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

  addToTextarea(text: string, field: 'reportText' | 'description') {
    const val = this.alertForm.get(field)?.value || '';
    this.alertForm.get(field)?.setValue(`${val} ${text}`.trim());
  }

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: Pick<MonitorItem, 'id' | 'system_name'>,
    private dialogRef: MatDialogRef<CreateAlertDialogComponent>
  ) {}

  async save() {
    if (!this.alertForm.disabled) {
      this.alertForm.disable();

      const openDate = this.alertForm.get('openTime')?.value || new Date();
      const followUpDate = this.alertForm.get('tracingTime')?.value;
      const closeDate = this.alertForm.get('closeTime')?.value;

      const parseNumber = (value: unknown): number | null => {
        if (value === null || value === undefined || value === '') {
          return null;
        }
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      };

      const malfunction = {
        code: this.alertForm.get('code')?.value || null,
        customerPrice: parseNumber(this.alertForm.get('customerPrice')?.value),
        description: this.alertForm.get('description')?.value || '',
        golanSolarPrice: parseNumber(this.alertForm.get('golanSolarPrice')?.value),
        handler: this.alertForm.get('handler')?.value || null,
        kwhKwpSnapshot: null,
        notToReport: Boolean(this.alertForm.get('notToReport')?.value),
        openTime: DateUtil.ToUtcMidnightIso(openDate) || '',
        reportText: this.alertForm.get('reportText')?.value || '',
        severity: Number(this.alertForm.get('severity')?.value) || 2,
        status: MalfunctionStatus.OPEN,
        serial: 0,
        tracingTime: followUpDate?.toISOString
          ? DateUtil.ToUtcMidnightIso(followUpDate) || ''
          : null,
        closeTime: closeDate?.toISOString
          ? DateUtil.ToUtcMidnightIso(closeDate) || ''
          : '',
        systemId: this.data.id,
        type: [String(this.alertForm.get('type')?.value), ''] as [
          string,
          string,
        ],
        requestNumber: this.alertForm.get('requestNumber')?.value || '',
      };

      this.malfunctionsService.createMalfunction(malfunction).subscribe(() => {
        this.dialogRef.close(true);
      });
    }
  }
}
