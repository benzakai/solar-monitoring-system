import {Pipe, PipeTransform, OnDestroy, inject, ChangeDetectorRef} from '@angular/core';
import {Subscription} from 'rxjs';
import {LANGUAGE, LANGUAGE_DICTIONARY} from '../../lang';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false,
})
export class TranslatePipe implements PipeTransform, OnDestroy {
  private currentValue: any;
  private subscription: Subscription | null = null;

  private lang = inject(LANGUAGE);
  private dictionary= inject(LANGUAGE_DICTIONARY);
  private changeDetectorRef = inject(ChangeDetectorRef);

  transform(value: string): any {
    if (!this.subscription) {
      this.subscription = this.lang.subscribe((lng) => {
        this.currentValue = this.dictionary[value][lng];
        this.changeDetectorRef.markForCheck();
      });
    }
    return this.currentValue;
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
