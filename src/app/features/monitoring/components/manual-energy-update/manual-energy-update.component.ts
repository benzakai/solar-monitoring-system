import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogClose,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCell } from '@angular/material/table';
import { BehaviorSubject } from 'rxjs';
import { TranslatePipe } from '../../../../core/lang/translate.pipe';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { Energy, EnergySample } from '../../../../domain/energy';
import { System } from '../../../../domain/system';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { provideNativeDateAdapter } from '@angular/material/core';
import { DATE_FORMATS } from '../create-alert-dialog/create-alert-dialog.component';
import { EnergyService } from '../../../../endpoint/energy.service';
import { DateUtil } from '../../../../core/date/DateUtil';

@Component({
  selector: 'app-manual-energy-update',
  standalone: true,
  imports: [
    AsyncPipe,
    MatDialogClose,
    MatIcon,
    MatIconButton,
    MatButton,
    MatCell,
    TranslatePipe,
    MatDialogModule,
    MatProgressSpinner,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatInputModule,
  ],
  providers: [provideNativeDateAdapter(DATE_FORMATS)],
  templateUrl: './manual-energy-update.component.html',
  styleUrl: './manual-energy-update.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManualEnergyUpdateComponent {
  action = new BehaviorSubject(false);
  energyService = inject(EnergyService);
  dialogRef = inject<MatDialogRef<ManualEnergyUpdateComponent>>(MatDialogRef);
  data: { system: System; energy: Energy } = inject(MAT_DIALOG_DATA);
  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      energyData: this.fb.array([]),
    });

    let addEmpty = true;

    const annualSamples: EnergySample[] = [
      ...(this.data?.energy?.annual || []),
    ].sort(
      (a: EnergySample, b: EnergySample) =>
        new Date(a.time).getTime() - new Date(b.time).getTime()
    );

    annualSamples.forEach((energy: EnergySample) => {
      if (energy.apiValue || energy.apiValue === 0) {
        addEmpty = false;
        this.addEnergyData(
          energy.apiValue,
          energy.valueKwh,
          new Date(energy.time)
        );
      }
    });
    if (addEmpty) {
      this.addEnergyData();
    }
  }

  get energyData(): FormArray {
    return this.form.get('energyData') as FormArray;
  }

  addEnergyData(api = 0, manual = 0, date: Date | null = null) {
    const energyGroup = this.fb.group({
      api: [api],
      manual: [manual],
      date: [date],
    });
    energyGroup.get('api')?.disable();
    this.energyData.push(energyGroup);

    console.log('energyData', this.energyData);
  }

  removeEnergyData(index: number) {
    this.energyData.removeAt(index);
  }

  dataChanged(i: number, event: any) {
    const date = event.value;
    const selectedDate = new Date(date).toDateString();
    (this.data?.energy?.annual || []).forEach((energy: EnergySample) => {
      const dateOfSample = new Date(energy.time).toDateString();
      if (dateOfSample === selectedDate) {
        this.energyData
          .at(i)
          .get('api')
          ?.setValue(energy.apiValue || energy.valueKwh);
        this.energyData.at(i).get('manual')?.setValue(energy.valueKwh);
      }
    });
  }

  save() {
    this.action.next(true);

    const energyData: any[] = this.form.getRawValue().energyData;

    const energyDataMap = energyData.reduce(
      (acc, curr) =>
        Object.assign(acc, {
          [DateUtil.ToUtcMidnightIso(curr.date) || '']: curr,
        }),
      {}
    );

    const updatedAnnual: EnergySample[] = (this.data?.energy?.annual || [])
      .map((energy: EnergySample) => {
        let dateOfSample;
        try {
          dateOfSample = DateUtil.ToUtcMidnightIso(new Date(energy.time)) || '';
        } catch (e) {
          return null;
        }

        if (dateOfSample && energyDataMap[dateOfSample]) {
          const sample = {
            ...energy,
            valueKwh: Number(energyDataMap[dateOfSample].manual) || 0,
            apiValue: Number(energyDataMap[dateOfSample].api) || 0,
          };
          delete energyDataMap[dateOfSample];
          return sample;
        } else if (energy.apiValue !== undefined) {
          const { apiValue, ...rest } = energy;
          return {
            ...rest,
            valueKwh: Number(apiValue) || 0,
          };
        }
        return energy;
      })
      .filter((e): e is EnergySample => e !== null);

    (Object.keys(energyDataMap) || []).map((k) => {
      updatedAnnual.push({
        time: new Date(k).getTime(),
        valueKwh: Number(energyDataMap[k].manual) || 0,
        apiValue: Number(energyDataMap[k].api) || 0,
      });
    });

    console.log(updatedAnnual);

    this.energyService
      .updateAnnualEnergy(this.data.system.id, updatedAnnual)
      .subscribe(() => {
        this.dialogRef.close(updatedAnnual);
      });
  }
}
