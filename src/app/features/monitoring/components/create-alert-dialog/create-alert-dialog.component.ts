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
import { MalfunctionsService } from '../../../../endpoint/malfunctions.service';
import { MonitorItem } from '../../../../domain/monitor-item';
import { TranslatePipe } from '../../../../core/lang/translate.pipe';

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
  ],
  templateUrl: './create-alert-dialog.component.html',
  styleUrl: './create-alert-dialog.component.css',
  providers: [provideNativeDateAdapter(DATE_FORMATS)],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateAlertDialogComponent {
  malfunctionsService = inject(MalfunctionsService);

  alertForm: FormGroup = new FormGroup({
    openingDate: new FormControl(new Date()),
    requestNumber: new FormControl(''),
    issueType: new FormControl(''),
    followUpDate: new FormControl(''),
    reportStatus: new FormControl(''),
  });

  issueTypes: string[] = [
    'אופטימייזר',
    'אחר',
    'זליגה',
    'ייצור',
    'מאוורר',
    'ממיר',
    'מתח מהרשת',
    'סטרינג',
    'פאנל',
    'תפוקה',
    'תקשורת',
  ];

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

  addToTextarea(text: string) {
    const val = this.alertForm.get('reportStatus')?.value;
    this.alertForm.get('reportStatus')?.setValue(val + ' ' + text);
  }

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: MonitorItem,
    private dialogRef: MatDialogRef<CreateAlertDialogComponent>
  ) {}

  save() {
    if (!this.alertForm.disabled) {
      this.alertForm.disable();

      const openDate = this.alertForm.get('openingDate')?.value || new Date();
      const followUpDate =
        this.alertForm.get('followUpDate')?.value || openDate;

      const malfunction = {
        description: this.alertForm.get('reportStatus')?.value,
        systemId: this.data.id,
        openTime: openDate.toISOString(),
        tracingTime: followUpDate.toISOString(),
        type: this.alertForm.get('issueType')?.value,
        serial: this.alertForm.get('requestNumber')?.value,
        status: 'open',
      };

      this.malfunctionsService.saveMalfunction(malfunction).subscribe(() => {
        this.dialogRef.close(true);
      });
    }
  }
}
