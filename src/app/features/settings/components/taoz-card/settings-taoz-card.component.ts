import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslatePipe } from '../../../../core/lang/translate.pipe';
import { AppEndpointService } from '../../../../endpoint/app-endpoint.service';
import { Tarifs } from '../../../../domain/tarifs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-settings-taoz-card',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
    TranslatePipe,
  ],
  templateUrl: './settings-taoz-card.component.html',
  styleUrl: './settings-taoz-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsTaozCardComponent implements OnInit {
  private fb = inject(FormBuilder);
  private appEndpoint = inject(AppEndpointService);
  private destroyRef = inject(DestroyRef);

  form?: FormGroup;
  loading$ = new BehaviorSubject<boolean>(true);
  saving = false;

  ngOnInit(): void {
    this.appEndpoint
      .get('TaarifConstants')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((constants) => {
        this.buildForm(constants || null);
        this.loading$.next(false);
      });
  }

  save(): void {
    if (!this.form) {
      return;
    }
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const value = this.form.value as Tarifs;
    this.saving = true;
    this.appEndpoint
      .set('TaarifConstants', value)
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

  private buildForm(constants: Tarifs | null) {
    const validators = [Validators.required, Validators.min(0)];
    this.form = this.fb.group({
      highTaoz: this.fb.group({
        summer: [constants?.highTaoz.summer ?? 0, validators],
        winter: [constants?.highTaoz.winter ?? 0, validators],
        between: [constants?.highTaoz.between ?? 0, validators],
      }),
      lowTaoz: this.fb.group({
        summer: [constants?.lowTaoz.summer ?? 0, validators],
        winter: [constants?.lowTaoz.winter ?? 0, validators],
        between: [constants?.lowTaoz.between ?? 0, validators],
      }),
    });
  }
}


