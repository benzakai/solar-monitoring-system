import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject } from 'rxjs';
import { AppEndpointService } from '../../../../endpoint/app-endpoint.service';
import { AppPrediction } from '../../../../domain/app';
import { TranslatePipe } from '../../../../core/lang/translate.pipe';
import { MonthsInputsComponent } from '../../../system-settings/components/months-inputs/months-inputs.component';

@Component({
  selector: 'app-settings-prediction-card',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    TranslatePipe,
    MonthsInputsComponent,
  ],
  templateUrl: './settings-prediction-card.component.html',
  styleUrl: './settings-prediction-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPredictionCardComponent implements OnInit {
  private fb = inject(FormBuilder);
  private appEndpoint = inject(AppEndpointService);
  private destroyRef = inject(DestroyRef);
  translatePipe = new TranslatePipe();

  loading$ = new BehaviorSubject<boolean>(true);
  saving = false;
  form?: FormGroup;
  distributionError: string | null = null;

  ngOnInit(): void {
    this.appEndpoint
      .get('prediction')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.buildForm(value || undefined);
        this.loading$.next(false);
      });
  }

  get normalDistribution(): FormArray {
    return (this.form?.get('MONTH_DIST_NORMAL') as FormArray)!;
  }

  get taozDistribution(): FormArray {
    return (this.form?.get('MONTH_DIST_TAOZ') as FormArray)!;
  }

  save(): void {
    if (!this.form) {
      return;
    }

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const value = this.form.getRawValue();
    const normal = [...(value.MONTH_DIST_NORMAL as number[])];
    const taoz = [...(value.MONTH_DIST_TAOZ as number[])];

    const remainNormal = 100 - normal.reduce((prev, curr) => prev + curr, 0);
    const remainTaoz = 100 - taoz.reduce((prev, curr) => prev + curr, 0);

    if (Math.abs(remainNormal) > 1 || Math.abs(remainTaoz) > 1) {
      this.distributionError = this.translatePipe.transform(
        'settings.prediction.validation.invalidDistribution'
      );
      return;
    }

    this.distributionError = null;

    const defaultAnnual = Number(value.DEFAULT_ANNUAL ?? 0);
    const trackerFactor = Number(value.TRACKER_FACTOR ?? 0);
    const autoWashFactor = Number(value.AUTO_WASH_FACTOR ?? 0);
    const azimuthFactor = Number(value.AZIMUTH_FACTOR ?? 0);
    const ageFactor = Number(value.AGE_FACTOR ?? 0);

    const payload: AppPrediction = {
      DEFAULT_ANNUAL: defaultAnnual,
      TRACKER_FACTOR: trackerFactor / 100,
      AUTO_WASH_FACTOR: autoWashFactor / 100,
      AZIMUTH_FACTOR: azimuthFactor / 100,
      AGE_FACTOR: ageFactor / 100,
      MONTH_DIST_NORMAL: normal.map(
        (v) => (v + remainTaoz / 12) / 100
      ),
      MONTH_DIST_TAOZ: taoz.map((v) => (v + remainNormal / 12) / 100),
    };

    this.saving = true;
    this.appEndpoint
      .set('prediction', payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving = false;
          this.form?.markAsPristine();
        },
        error: () => {
          this.saving = false;
        },
      });
  }

  private buildForm(prediction?: AppPrediction) {
    this.form = this.fb.group({
      DEFAULT_ANNUAL: [
        prediction?.DEFAULT_ANNUAL ?? 0,
        [Validators.required, Validators.min(0)],
      ],
      TRACKER_FACTOR: [
        (prediction?.TRACKER_FACTOR ?? 0) * 100,
        [Validators.required, Validators.min(0)],
      ],
      AUTO_WASH_FACTOR: [
        (prediction?.AUTO_WASH_FACTOR ?? 0) * 100,
        [Validators.required, Validators.min(0)],
      ],
      AZIMUTH_FACTOR: [
        (prediction?.AZIMUTH_FACTOR ?? 0) * 100,
        [Validators.required, Validators.min(0), Validators.max(100)],
      ],
      AGE_FACTOR: [
        (prediction?.AGE_FACTOR ?? 0) * 100,
        [Validators.required, Validators.min(0), Validators.max(100)],
      ],
      MONTH_DIST_NORMAL: this.createDistributionArray(
        prediction?.MONTH_DIST_NORMAL
      ),
      MONTH_DIST_TAOZ: this.createDistributionArray(
        prediction?.MONTH_DIST_TAOZ
      ),
    });
  }

  private createDistributionArray(source?: number[]): FormArray {
    const base = source && source.length === 12 ? source : Array(12).fill(1 / 12);
    return this.fb.array(
      base.map((value) =>
        this.fb.control(value * 100, [
          Validators.required,
          Validators.min(0),
          Validators.max(100),
        ])
      )
    );
  }
}


