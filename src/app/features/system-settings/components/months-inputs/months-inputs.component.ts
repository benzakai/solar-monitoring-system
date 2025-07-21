import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { FormArray, FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntil } from 'rxjs/operators';
import { formatNumber, CommonModule, JsonPipe } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Subject } from 'rxjs';
import { TranslatePipe } from '../../../../core/lang/translate.pipe';

@Component({
  selector: 'app-months-inputs',
  templateUrl: './months-inputs.component.html',
  styleUrls: ['./months-inputs.component.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    TranslatePipe,
    JsonPipe,
  ],
})
export class MonthsInputsComponent implements OnInit, OnDestroy {
  readonly months: Date[] = this.getMonths();
  readonly monthKeys = [
    'jan',
    'feb',
    'mar',
    'apr',
    'may',
    'jun',
    'jul',
    'aug',
    'sep',
    'oct',
    'nov',
    'dec',
  ];
  protected onDestroy$ = new Subject<void>();

  @Input() formArray: FormArray | undefined;

  @Input() allowDecimal: number = 0;

  @Output() onChange = new EventEmitter<number[]>();

  constructor() {}

  ngOnInit() {
    if (this.formArray !== undefined) {
      this.months.forEach((m, i) => {
        // @ts-ignore
        const formControl = this.formArray.at(i);
        formControl.valueChanges
          .pipe(takeUntil(this.onDestroy$))
          .subscribe((value) => {
            formControl.setValue(this.round(value), { emitEvent: false });
            // @ts-ignore
            this.onChange.emit(this.formArray.value);
          });
        setTimeout(() => {
          formControl.setValue(this.round(formControl.value), {
            emitEvent: false,
          });
        });
      });
    }
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  round(x: number): number {
    if (x === null || x === undefined) {
      return x;
    }
    return +formatNumber(x, 'en-US', '1.0-' + this.allowDecimal);
  }

  private getMonths(): Date[] {
    const months: Date[] = [];
    for (let i = 0; i < 12; i++) {
      months.push(new Date(2024, i, 1));
    }
    return months;
  }

  getFormControl(i: number): FormControl {
    // @ts-ignore
    return this.formArray.at(i) as FormControl;
  }
}
